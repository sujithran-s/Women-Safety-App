package expo.modules.directsms

import android.Manifest
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.telephony.SmsManager
import expo.modules.interfaces.permissions.Permissions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.UUID

class DirectSmsModule : Module() {
  companion object {
    private const val EVENT_SMS_DELIVERY = "onSmsDelivery"
  }

  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()
  private val permissionsManager: Permissions
    get() = appContext.permissions ?: throw Exceptions.PermissionsModuleNotFound()

  override fun definition() = ModuleDefinition {
    Name("DirectSms")
    Events(EVENT_SMS_DELIVERY)

    AsyncFunction("requestPermissionsAsync") { promise: Promise ->
      Permissions.askForPermissionsWithPermissionsManager(permissionsManager, promise, Manifest.permission.SEND_SMS)
    }

    AsyncFunction("sendAsync") { recipients: List<String>, message: String ->
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && context.checkSelfPermission(Manifest.permission.SEND_SMS) != PackageManager.PERMISSION_GRANTED) {
        throw SecurityException("SEND_SMS permission has not been granted")
      }

      val messageId = "sms-${UUID.randomUUID()}"
      val action = "${context.packageName}.DIRECT_SMS_$messageId"
      val smsManager = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        context.getSystemService(SmsManager::class.java)
      } else {
        @Suppress("DEPRECATION")
        SmsManager.getDefault()
      }

      var expectedCallbacks = 0
      recipients.filter { it.isNotBlank() }.forEach { recipient ->
        expectedCallbacks += if (message.length > 160) smsManager.divideMessage(message).size else 1
      }
      if (expectedCallbacks == 0) return@AsyncFunction messageId

      var remainingCallbacks = expectedCallbacks
      val receiver = object : BroadcastReceiver() {
        override fun onReceive(receiverContext: Context, intent: Intent) {
          val resultCode = resultCode
          val status = if (resultCode == android.app.Activity.RESULT_OK) "sent" else "failed"
          val payload = Bundle().apply {
            putString("messageId", intent.getStringExtra("messageId"))
            putString("recipient", intent.getStringExtra("recipient"))
            putString("status", status)
            putString("timestamp", System.currentTimeMillis().toString())
          }
          sendEvent(EVENT_SMS_DELIVERY, payload)
          remainingCallbacks -= 1
          if (remainingCallbacks <= 0) {
            runCatching { receiverContext.unregisterReceiver(this) }
          }
        }
      }
      val filter = IntentFilter(action)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        context.registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED)
      } else {
        @Suppress("DEPRECATION")
        context.registerReceiver(receiver, filter)
      }

      recipients.filter { it.isNotBlank() }.forEachIndexed { index, recipient ->
        val parts = if (message.length > 160) smsManager.divideMessage(message) else listOf(message)
        val pendingIntents = parts.mapIndexed { partIndex, _ ->
          val callbackIntent = Intent(action).apply {
            putExtra("messageId", messageId)
            putExtra("recipient", recipient)
            putExtra("part", partIndex)
          }
          val flags = PendingIntent.FLAG_UPDATE_CURRENT or if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
          PendingIntent.getBroadcast(context, index * 1000 + partIndex, callbackIntent, flags)
        }
        if (parts.size > 1) {
          smsManager.sendMultipartTextMessage(recipient, null, ArrayList(parts), null, ArrayList(pendingIntents))
        } else {
          smsManager.sendTextMessage(recipient, null, message, null, pendingIntents.first(), null)
        }
      }
      return@AsyncFunction messageId
    }
  }
}
