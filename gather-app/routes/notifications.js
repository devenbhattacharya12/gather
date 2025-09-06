// routes/notifications.js (New file)
const express = require('express');
const webpush = require('web-push');
const Subscription = require('../models/Subscription');
const auth = require('../middleware/auth');

const router = express.Router();

// Configure web-push (you'll need to generate VAPID keys)
webpush.setVapidDetails(
  'mailto:your-email@example.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Subscribe to push notifications
router.post('/subscribe', auth, async (req, res) => {
  try {
    const { endpoint, keys } = req.body;
    const userId = req.user._id;

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({ error: 'Invalid subscription data' });
    }

    // Save or update subscription
    await Subscription.findOneAndUpdate(
      { userId, endpoint },
      { userId, endpoint, keys, isActive: true },
      { upsert: true, new: true }
    );

    res.json({ message: 'Subscription saved successfully' });
  } catch (error) {
    console.error('Save subscription error:', error);
    res.status(500).json({ error: 'Failed to save subscription' });
  }
});

// Unsubscribe from push notifications
router.delete('/unsubscribe', auth, async (req, res) => {
  try {
    const { endpoint } = req.body;
    const userId = req.user._id;

    await Subscription.findOneAndUpdate(
      { userId, endpoint },
      { isActive: false }
    );

    res.json({ message: 'Unsubscribed successfully' });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    res.status(500).json({ error: 'Failed to unsubscribe' });
  }
});

// Send notification to user
async function sendNotificationToUser(userId, payload) {
  try {
    const subscriptions = await Subscription.find({ 
      userId, 
      isActive: true 
    });

    const notifications = subscriptions.map(subscription => {
      return webpush.sendNotification({
        endpoint: subscription.endpoint,
        keys: subscription.keys
      }, JSON.stringify(payload));
    });

    await Promise.allSettled(notifications);
  } catch (error) {
    console.error('Send notification error:', error);
  }
}

// Send notification to group members
async function sendNotificationToGroup(groupId, payload, excludeUserId = null) {
  try {
    const Group = require('../models/Group');
    const group = await Group.findById(groupId).populate('members');
    
    if (!group) return;

    const memberIds = group.members
      .map(member => member._id)
      .filter(id => !excludeUserId || id.toString() !== excludeUserId.toString());

    const subscriptions = await Subscription.find({
      userId: { $in: memberIds },
      isActive: true
    });

    const notifications = subscriptions.map(subscription => {
      return webpush.sendNotification({
        endpoint: subscription.endpoint,
        keys: subscription.keys
      }, JSON.stringify(payload));
    });

    await Promise.allSettled(notifications);
  } catch (error) {
    console.error('Send group notification error:', error);
  }
}

module.exports = { 
  router, 
  sendNotificationToUser, 
  sendNotificationToGroup 
};

// ---