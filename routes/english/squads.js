const express = require('express');
const router = express.Router();
const Squad = require('../../models/english/Squad');
const SquadMessage = require('../../models/english/SquadMessage');

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

// 3. Send a Message (🔥 UPDATED FOR REPLIES)
router.post('/:squadId/message', async (req, res) => {
  try {
    // 🔥 Req.body se reply wale fields nikaale
    const { senderEmail, type, text, postId, replyToId, replyToText, replyToUser } = req.body;
    
    const newMessage = new SquadMessage({
      squadId: req.params.squadId,
      senderEmail,
      type,
      text,
      postId,
      // 🔥 Naye fields yahan database me save honge
      replyToId: replyToId || null,
      replyToText: replyToText || null,
      replyToUser: replyToUser || null,
      readBy: [senderEmail] // Jisne bheja, usne toh padh hi liya
    });
    
    await newMessage.save();
    res.json({ success: true, message: newMessage });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. Get all messages (And Mark them as Read)
router.get('/:squadId/messages', async (req, res) => {
  try {
    const { email } = req.query; // UI se user ka email aayega (Query params)

    // Jaise hi user ne chat kholi, uske liye messages ko 'read' mark kar do
    if (email) {
      await SquadMessage.updateMany(
        { 
          squadId: req.params.squadId, 
          readBy: { $ne: email } // Sirf wo update karo jisme ye email nahi hai
        },
        { $push: { readBy: email } } // Email ko readBy array me daal do
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

    // Har squad ke liye unread count calculate karo
    const squadsWithUnreadCount = await Promise.all(squads.map(async (squad) => {
      const unreadCount = await SquadMessage.countDocuments({
        squadId: squad._id,
        readBy: { $ne: userEmail } // Un messages ko gino jisme user ka email readBy me nahi hai
      });
      
      return { ...squad, unreadCount };
    }));

    res.json({ success: true, squads: squadsWithUnreadCount });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;