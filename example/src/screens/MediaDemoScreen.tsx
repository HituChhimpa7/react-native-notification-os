import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { RNNOS } from 'react-native-notification-os';

const SAMPLE_IMAGE_URL = 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=60';
const PRODUCT_IMAGE_URL = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=60';

export const MediaDemoScreen: React.FC = () => {
  const triggerImageBannerNotification = async () => {
    await RNNOS.presentNotification({
      id: `img_banner_${Date.now()}`,
      messageId: `msg_img_${Date.now()}`,
      title: '🔥 Flash Sale: 50% Off Nike Sneakers!',
      body: 'Limited time deal on Nike Air Max. Grab yours before stock runs out!',
      subtitle: 'Exclusive Offer',
      imageUrl: PRODUCT_IMAGE_URL,
      category: 'order_updates',
      priority: 'HIGH',
      type: 'MEDIA',
      actions: [
        {
          id: 'action_shop_now',
          title: 'Shop Now 🛒',
          type: 'BUTTON',
        },
      ],
      data: {
        deepLink: 'app://shop/sneakers/nike_air_max',
      },
      timestamp: Date.now(),
    });
  };

  const triggerRichMediaNotification = async () => {
    await RNNOS.presentNotification({
      id: `media_art_${Date.now()}`,
      messageId: `msg_art_${Date.now()}`,
      title: '🎨 New Artwork Showcase',
      body: 'Explore high-resolution digital art collection presented by Antigravity.',
      imageUrl: SAMPLE_IMAGE_URL,
      category: 'chat_messages',
      priority: 'HIGH',
      type: 'MEDIA',
      actions: [
        {
          id: 'action_view_gallery',
          title: 'View Gallery 🖼️',
          type: 'BUTTON',
        },
      ],
      data: {
        deepLink: 'app://gallery/artwork_99',
      },
      timestamp: Date.now(),
    });
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.headerTitle}>🖼️ Rich Image & Media Notifications</Text>
      <Text style={styles.subTitle}>
        Experience BigPictureStyle push notifications with high-res images and action buttons.
      </Text>

      {/* Preview Card 1 */}
      <View style={styles.card}>
        <Image source={{ uri: PRODUCT_IMAGE_URL }} style={styles.previewImage} />
        <Text style={styles.cardTitle}>🔥 Flash Sale Notification</Text>
        <Text style={styles.cardBody}>BigPictureStyle banner with product image & action button.</Text>
        <TouchableOpacity style={styles.button} onPress={triggerImageBannerNotification}>
          <Text style={styles.buttonText}>Simulate Image Banner Push 🚀</Text>
        </TouchableOpacity>
      </View>

      {/* Preview Card 2 */}
      <View style={styles.card}>
        <Image source={{ uri: SAMPLE_IMAGE_URL }} style={styles.previewImage} />
        <Text style={styles.cardTitle}>🎨 Digital Art Showcase</Text>
        <Text style={styles.cardBody}>Rich artwork push notification with interactive gallery button.</Text>
        <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={triggerRichMediaNotification}>
          <Text style={styles.buttonText}>Simulate Artwork Push 🖼️</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
    padding: 16,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subTitle: {
    color: '#94a3b8',
    fontSize: 13,
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  previewImage: {
    width: '100%',
    height: 140,
    borderRadius: 8,
    marginBottom: 12,
  },
  cardTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardBody: {
    color: '#94a3b8',
    fontSize: 13,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#6366f1',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: '#059669',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
});
