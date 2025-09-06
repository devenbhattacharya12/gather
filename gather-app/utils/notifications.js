// utils/notifications.js (New file)
const { sendNotificationToUser, sendNotificationToGroup } = require('../routes/notifications');

// Notification when new daily question is posted
async function notifyNewQuestion(question) {
  // This would typically be called by a cron job or scheduler
  const payload = {
    title: 'New Daily Question',
    body: question.text.substring(0, 100) + (question.text.length > 100 ? '...' : ''),
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    url: '/'
  };

  // Send to all active users (you'd need to implement this based on your needs)
  // For now, we'll implement this when someone creates a custom question
}

// Notification when someone responds in a group
async function notifyNewResponse(response, groupId, authorId) {
  const payload = {
    title: 'New Response in Group',
    body: `${response.userId.username} shared their thoughts`,
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    url: `/group.html?id=${groupId}`
  };

  await sendNotificationToGroup(groupId, payload, authorId);
}

// Notification when someone likes your response
async function notifyResponseLiked(response, likerUsername) {
  const payload = {
    title: 'Response Liked',
    body: `${likerUsername} liked your response`,
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    url: `/group.html?id=${response.groupId}`
  };

  await sendNotificationToUser(response.userId, payload);
}

// Notification when someone replies to your response
async function notifyResponseReply(response, replyAuthor, replyText) {
  const payload = {
    title: 'New Reply',
    body: `${replyAuthor} replied: ${replyText.substring(0, 50)}${replyText.length > 50 ? '...' : ''}`,
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    url: `/group.html?id=${response.groupId}`
  };

  await sendNotificationToUser(response.userId, payload);
}

module.exports = {
  notifyNewQuestion,
  notifyNewResponse,
  notifyResponseLiked,
  notifyResponseReply
};

// ---