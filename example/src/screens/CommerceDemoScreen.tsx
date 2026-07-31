import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { RNNOS, useCommerceOrder } from 'react-native-notification-os';

const ORDER_STEPS = [
  { step: 1, name: 'Order Placed', status: 'Restaurant accepted your order', percent: 20, eta: '35 mins' },
  { step: 2, name: 'Preparing Food', status: 'Chef is cooking your pizza', percent: 45, eta: '25 mins' },
  { step: 3, name: 'Picked Up', status: 'Valet picked up your package', percent: 70, eta: '12 mins' },
  { step: 4, name: 'Out for Delivery', status: 'Valet is 2 mins away', percent: 90, eta: '2 mins' },
  { step: 5, name: 'Delivered', status: 'Order delivered! Enjoy your meal', percent: 100, eta: 'Delivered' },
];

export const CommerceDemoScreen: React.FC = () => {
  const orderId = 'ORD_99482';
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);

  const { progress } = useCommerceOrder(orderId);

  const advanceOrderStep = async () => {
    const nextIndex = (currentStepIndex + 1) % ORDER_STEPS.length;
    setCurrentStepIndex(nextIndex);

    const stepInfo = ORDER_STEPS[nextIndex];

    await RNNOS.presentNotification({
      id: `order_${orderId}`, // Fixed ID for continuous update
      messageId: `msg_order_${Date.now()}`,
      title: `🍕 Zomato Order #${orderId}`,
      body: `${stepInfo.name}: ${stepInfo.status}`,
      category: 'order_updates',
      priority: 'HIGH',
      type: 'COMMERCE',
      color: '#22c55e',
      useCustomLayout: true,
      commerceMetadata: {
        orderId,
        currentStep: stepInfo.step,
        totalSteps: 5,
        stepName: stepInfo.name,
        progressPercent: stepInfo.percent,
        estimatedDelivery: stepInfo.eta,
        statusText: stepInfo.status,
      },
      data: {
        deepLink: `app://orders/${orderId}`,
      },
      timestamp: Date.now(),
    });
  };

  const activeProgress = progress || {
    orderId,
    currentStep: ORDER_STEPS[currentStepIndex].step,
    totalSteps: 5,
    stepName: ORDER_STEPS[currentStepIndex].name,
    progressPercent: ORDER_STEPS[currentStepIndex].percent,
    estimatedDelivery: ORDER_STEPS[currentStepIndex].eta,
    statusText: ORDER_STEPS[currentStepIndex].status,
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>🛵 Zomato / Swiggy / Uber Order Tracking</Text>
      
      {/* Live Tracker Card */}
      <View style={styles.card}>
        <Text style={styles.orderTitle}>Order #{activeProgress.orderId}</Text>
        <Text style={styles.stepTitle}>{activeProgress.stepName}</Text>
        <Text style={styles.statusSubtext}>{activeProgress.statusText}</Text>
        
        <View style={styles.progressTrack}>
          <View style={[styles.progressBar, { width: `${activeProgress.progressPercent}%` }]} />
        </View>

        <View style={styles.etaRow}>
          <Text style={styles.etaLabel}>Estimated Delivery</Text>
          <Text style={styles.etaValue}>{activeProgress.estimatedDelivery}</Text>
        </View>
      </View>

      {/* Timeline Steps */}
      <ScrollView style={styles.timelineContainer}>
        {ORDER_STEPS.map((s, idx) => {
          const isDone = activeProgress.currentStep >= s.step;
          return (
            <View key={s.step} style={styles.timelineRow}>
              <View style={[styles.dot, isDone && styles.dotDone]} />
              <View style={styles.timelineContent}>
                <Text style={[styles.timelineStepName, isDone && styles.textDone]}>
                  Step {s.step}: {s.name}
                </Text>
                <Text style={styles.timelineStatus}>{s.status}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Action Button */}
      <TouchableOpacity style={styles.nextStepBtn} onPress={advanceOrderStep}>
        <Text style={styles.nextStepText}>⚡ Push Next Step Update (Continuous Single Banner)</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 16 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#f8fafc', marginBottom: 12 },
  card: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#22c55e' },
  orderTitle: { color: '#94a3b8', fontSize: 12, fontWeight: '600', marginBottom: 4 },
  stepTitle: { color: '#f8fafc', fontSize: 20, fontWeight: '800', marginBottom: 4 },
  statusSubtext: { color: '#cbd5e1', fontSize: 13, marginBottom: 12 },
  progressTrack: { height: 10, backgroundColor: '#334155', borderRadius: 5, overflow: 'hidden', marginBottom: 12 },
  progressBar: { height: '100%', backgroundColor: '#22c55e', borderRadius: 5 },
  etaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  etaLabel: { color: '#94a3b8', fontSize: 12 },
  etaValue: { color: '#22c55e', fontSize: 14, fontWeight: '700' },
  timelineContainer: { flex: 1, backgroundColor: '#1e293b', borderRadius: 12, padding: 12, marginBottom: 16 },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#475569', marginTop: 4, marginRight: 12 },
  dotDone: { backgroundColor: '#22c55e' },
  timelineContent: { flex: 1 },
  timelineStepName: { color: '#94a3b8', fontWeight: '700', fontSize: 14 },
  textDone: { color: '#22c55e' },
  timelineStatus: { color: '#64748b', fontSize: 12, marginTop: 2 },
  nextStepBtn: { backgroundColor: '#2563eb', padding: 14, borderRadius: 10, alignItems: 'center' },
  nextStepText: { color: '#ffffff', fontWeight: '700', fontSize: 13 },
});
