import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { RNNOS, useChatThread } from 'react-native-notification-os';

export const ChatDemoScreen: React.FC = () => {
  const [activeThreadId, setActiveThreadId] = useState<string>('thread_alice_101');
  const [replyInput, setReplyInput] = useState<string>('');
  
  const { conversation, markRead } = useChatThread(activeThreadId);

  const simulateIncomingChatMessage = async () => {
    const time = new Date().toLocaleTimeString();
    await RNNOS.presentNotification({
      id: `msg_${Date.now()}`,
      messageId: `msg_id_${Date.now()}`,
      threadId: activeThreadId,
      title: 'Alice Johnson',
      body: `Hey! Sending this message at ${time}`,
      subtitle: 'Work Project',
      category: 'chat_messages',
      priority: 'HIGH',
      type: 'CHAT',
      actions: [
        {
          id: 'action_reply',
          title: 'Reply',
          type: 'TEXT_INPUT',
          placeholder: 'Type reply...',
        },
        {
          id: 'action_mark_read',
          title: 'Mark Read ✔',
          type: 'BUTTON',
        },
      ],
      chatMetadata: {
        threadId: activeThreadId,
        senderId: 'user_alice',
        senderName: 'Alice Johnson',
        isGroup: true,
        groupName: 'Work Project',
        messages: [
          {
            id: `msg_internal_${Date.now()}`,
            text: `Hey! Sending this message at ${time}`,
            timestamp: Date.now(),
            senderId: 'user_alice',
            senderName: 'Alice Johnson',
          },
        ],
      },
      data: {
        deepLink: 'app://chat/thread_alice_101',
      },
      timestamp: Date.now(),
    });
  };

  const simulateBackgroundChatNotification = async () => {
    // Send message to another chat thread that is currently CLOSED
    const targetThread = 'thread_bob_202';
    await RNNOS.presentNotification({
      id: `msg_bob_${Date.now()}`,
      messageId: `msg_id_bob_${Date.now()}`,
      threadId: targetThread,
      title: 'Bob Smith',
      body: 'Are we still meeting at 4 PM for the architecture review?',
      category: 'chat_messages',
      priority: 'HIGH',
      type: 'CHAT',
      actions: [
        {
          id: 'action_reply',
          title: 'Reply',
          type: 'TEXT_INPUT',
          placeholder: 'Reply to Bob...',
        },
        {
          id: 'action_mark_read',
          title: 'Mark Read ✔',
          type: 'BUTTON',
        },
      ],
      chatMetadata: {
        threadId: targetThread,
        senderId: 'user_bob',
        senderName: 'Bob Smith',
        isGroup: false,
        messages: [
          {
            id: `msg_bob_int_${Date.now()}`,
            text: 'Are we still meeting at 4 PM for the architecture review?',
            timestamp: Date.now(),
            senderId: 'user_bob',
            senderName: 'Bob Smith',
          },
        ],
      },
      data: {
        deepLink: 'app://chat/thread_bob_202',
      },
      timestamp: Date.now(),
    });
  };

  const handleSendReply = () => {
    if (!replyInput.trim()) return;
    RNNOS.Chat.appendUserReply(activeThreadId, replyInput.trim());
    setReplyInput('');
  };

  const handleMarkRead = () => {
    markRead();
    RNNOS.dismissNotification(activeThreadId);
    RNNOS.dismissNotification('thread_bob_202');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>💬 WhatsApp / Telegram Chat Engine</Text>
      
      {/* Thread Switcher */}
      <View style={styles.threadBar}>
        <TouchableOpacity
          style={[styles.threadTab, activeThreadId === 'thread_alice_101' && styles.activeTab]}
          onPress={() => {
            setActiveThreadId('thread_alice_101');
            RNNOS.dismissNotification('thread_alice_101');
          }}
        >
          <Text style={styles.tabText}>Alice (Active)</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.threadTab, activeThreadId === 'thread_bob_202' && styles.activeTab]}
          onPress={() => {
            setActiveThreadId('thread_bob_202');
            RNNOS.dismissNotification('thread_bob_202');
          }}
        >
          <Text style={styles.tabText}>Bob (Background)</Text>
        </TouchableOpacity>
      </View>

      {/* Messages List */}
      <ScrollView style={styles.chatBox}>
        {conversation?.messages.map((msg) => {
          const isMe = msg.senderId === 'user_me';
          return (
            <View key={msg.id} style={[styles.bubble, isMe ? styles.myBubble : styles.theirBubble]}>
              <Text style={styles.senderName}>{msg.senderName}</Text>
              <Text style={styles.messageText}>{msg.text}</Text>
              <Text style={styles.timestamp}>
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          );
        })}
        {(!conversation || conversation.messages.length === 0) && (
          <Text style={styles.emptyText}>No messages in thread. Simulate an incoming message below!</Text>
        )}
      </ScrollView>

      {/* Input Bar */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="Type inline reply..."
          value={replyInput}
          onChangeText={setReplyInput}
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSendReply}>
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>

      {/* Action Simulation Buttons */}
      <View style={styles.actionsBar}>
        <TouchableOpacity style={styles.actionBtn} onPress={simulateIncomingChatMessage}>
          <Text style={styles.actionBtnText}>⚡ Incoming (Active Chat Open)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.secondaryBtn]} onPress={simulateBackgroundChatNotification}>
          <Text style={styles.actionBtnText}>🔔 Incoming (Closed Chat Banner)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.readBtn]} onPress={handleMarkRead}>
          <Text style={styles.actionBtnText}>✓ Mark Read</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 16 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#f8fafc', marginBottom: 12 },
  threadBar: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  threadTab: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: '#1e293b', alignItems: 'center' },
  activeTab: { backgroundColor: '#2563eb' },
  tabText: { color: '#ffffff', fontWeight: '600', fontSize: 13 },
  chatBox: { flex: 1, backgroundColor: '#1e293b', borderRadius: 12, padding: 12, marginBottom: 12 },
  bubble: { maxWidth: '80%', padding: 10, borderRadius: 10, marginBottom: 8 },
  myBubble: { alignSelf: 'flex-end', backgroundColor: '#2563eb' },
  theirBubble: { alignSelf: 'flex-start', backgroundColor: '#334155' },
  senderName: { fontSize: 10, color: '#94a3b8', fontWeight: '700', marginBottom: 2 },
  messageText: { color: '#ffffff', fontSize: 14 },
  timestamp: { fontSize: 9, color: '#cbd5e1', alignSelf: 'flex-end', marginTop: 4 },
  emptyText: { color: '#64748b', textAlign: 'center', marginTop: 40, fontStyle: 'italic' },
  inputContainer: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  textInput: { flex: 1, backgroundColor: '#1e293b', borderRadius: 8, paddingHorizontal: 12, color: '#ffffff' },
  sendButton: { backgroundColor: '#2563eb', paddingHorizontal: 16, borderRadius: 8, justifyContent: 'center' },
  sendButtonText: { color: '#ffffff', fontWeight: '700' },
  actionsBar: { gap: 8 },
  actionBtn: { backgroundColor: '#10b981', padding: 12, borderRadius: 8, alignItems: 'center' },
  secondaryBtn: { backgroundColor: '#8b5cf6' },
  readBtn: { backgroundColor: '#64748b' },
  actionBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 13 },
});
