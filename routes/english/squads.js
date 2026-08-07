const express = require('express');
const router = express.Router();
const Squad = require('../../models/english/Squad');
const SquadMessage = require('../../models/english/SquadMessage');

// 🔥 NAYE IMPORTS: Notifications bhejne ke liye
const admin = require('../../config/firebaseAdmin'); 
const EnglishUser = require('../../models/EnglishUser'); 
const Notification = require('../../models/english/Notification'); // 👈 YE MISSING THA!

// 1. Create a new Squad
router.post('/create', async (req, res) => {
  try {
    const { name, email } = req.body;
    const newSquad = new Squad({ name, createdBy: email, members: [email] });
    await newSquad.save();
    res.json({ success: true, squad: newSquad });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Add Member to Squad
router.post('/:squadId/add-member', async (req, res) => {
  try {
    const { newMemberEmail } = req.body;
    const squad = await Squad.findById(req.params.squadId);
    if (!squad) return res.status(404).json({ success: false, message: "Squad not found" });

    if (!squad.members.includes(newMemberEmail)) {
      squad.members.push(newMemberEmail);
      await squad.save();
    }
    res.json({ success: true, squad });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Send a Message (🔥 PERFECT LOGIC FOR DB + PUSH NOTIFICATIONS)
router.post('/:squadId/message', async (req, res) => {
  try {
    const { senderEmail, type, text, postId, replyToId, replyToText, replyToUser } = req.body;
    
    // 1. Message Database me save karo
    const newMessage = new SquadMessage({
      squadId: req.params.squadId,
      senderEmail,
      type,
      text,
      postId,
      replyToId: replyToId || null,
      replyToText: replyToText || null,
      replyToUser: replyToUser || null,
      readBy: [senderEmail] 
    });
    
    await newMessage.save();

    // --------------------------------------------------------
    // 🔥 FIREBASE PUSH & DB NOTIFICATION LOGIC START 🔥
    // --------------------------------------------------------
    try {
      const squad = await Squad.findById(req.params.squadId);
      
      if (squad) {
        const recipientEmails = squad.members.filter(email => email !== senderEmail);
        
        if (recipientEmails.length > 0) {
          
          // 🔥 STEP A: DATABASE MEIN NOTIFICATION SAVE KARO (Panel me dikhane ke liye)
          const notificationsToSave = recipientEmails.map(email => ({
            recipientEmail: email,
            senderEmail: senderEmail,
            senderName: senderEmail.split('@')[0],
            type: 'CHAT',
            postId: squad._id.toString(), // Squad ID as postId
            word: squad.name,             // Squad ka naam
            message: type === "post" ? "Shared a Flashcard 🎯" : text
          }));
          await Notification.insertMany(notificationsToSave);

          // 🔥 STEP B: FIREBASE SE PHONE PAR PUSH BHEJO (Lock screen notification ke liye)
          const users = await EnglishUser.find({ 
            email: { $in: recipientEmails },
            fcmToken: { $exists: true, $ne: null, $ne: "" } 
          });
          
          const tokens = users.map(u => u.fcmToken);

          if (tokens.length > 0) {
            const senderName = senderEmail.split('@')[0];
            const messageBody = type === "post" ? "Shared a Flashcard 🎯" : text;

            const pushMessage = {
              notification: {
                title: `${squad.name} 💬`,
                body: `${senderName}: ${messageBody}`,
              },
              data: {
                squadId: squad._id.toString(), 
                type: "chat_message"
              },
              tokens: tokens,
            };

            await admin.messaging().sendEachForMulticast(pushMessage);
          }
        }
      }
    } catch (pushErr) {
      console.error("🚨 Chat Push Notification Error:", pushErr.message);
    }
    // --------------------------------------------------------

    res.json({ success: true, message: newMessage });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. Get all messages (And Mark them as Read)
router.get('/:squadId/messages', async (req, res) => {
  try {
    const { email } = req.query; 

    if (email) {
      await SquadMessage.updateMany(
        { 
          squadId: req.params.squadId, 
          readBy: { $ne: email } 
        },
        { $push: { readBy: email } } 
      );
    }

    const messages = await SquadMessage.find({ squadId: req.params.squadId })
      .populate('postId') 
      .sort({ timestamp: 1 }); 
    res.json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. Get all squads for a specific user (WITH UNREAD COUNT)
router.get('/user/:email', async (req, res) => {
  try {
    const userEmail = req.params.email;
    const squads = await Squad.find({ members: userEmail }).sort({ createdAt: -1 }).lean();

    const squadsWithUnreadCount = await Promise.all(squads.map(async (squad) => {
      const unreadCount = await SquadMessage.countDocuments({
        squadId: squad._id,
        readBy: { $ne: userEmail } 
      });
      
      return { ...squad, unreadCount };
    }));

    res.json({ success: true, squads: squadsWithUnreadCount });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;