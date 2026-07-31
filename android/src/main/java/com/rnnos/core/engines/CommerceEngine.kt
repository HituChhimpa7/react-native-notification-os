package com.rnnos.core.engines

import android.content.Context
import com.rnnos.core.domain.model.CommerceProgress
import com.rnnos.core.domain.model.NormalizedNotification
import com.rnnos.core.domain.model.NotificationType
import com.rnnos.core.renderers.NotificationRenderer
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.util.concurrent.ConcurrentHashMap

object CommerceEngine {

    // Store active order tracking states (OrderId -> CommerceProgress)
    private val activeOrders = ConcurrentHashMap<String, CommerceProgress>()

    fun updateOrderProgress(context: Context, notification: NormalizedNotification) {
        val commerce = notification.commerceMetadata ?: return
        val orderId = commerce.orderId

        activeOrders[orderId] = commerce

        val updatedNotification = notification.copy(
            id = "order_$orderId", // Single fixed notification ID for continuous update
            type = NotificationType.COMMERCE,
            commerceMetadata = commerce
        )

        CoroutineScope(Dispatchers.IO).launch {
            // Respect explicit silentUpdate flag if passed (e.g. for smooth micro-progress),
            // otherwise alert the user on each order status update step.
            val isSilent = notification.silentUpdate || commerce.silentUpdate
            NotificationRenderer.render(context, updatedNotification, isSilentUpdate = isSilent)
        }
    }

    fun getActiveOrderProgress(orderId: String): CommerceProgress? {
        return activeOrders[orderId]
    }
}
