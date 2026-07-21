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

    // Agar email pehle se nahi hai toh add karo
    if (!squad.members.includes(newMemberEmail)) {
      squad.members.push(newMemberEmail);
      await squad.save();
    }
    res.json({ success: true, squad });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Send a Message (Text or Shared Post)
router.post('/:squadId/message', async (req, res) => {
  try {
    const { senderEmail, type, text, postId } = req.body;
    const newMessage = new SquadMessage({
      squadId: req.params.squadId,
      senderEmail,
      type,
      text,
      postId
    });
    await newMessage.save();
    res.json({ success: true, message: newMessage });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. Get all messages for a Squad
router.get('/:squadId/messages', async (req, res) => {
  try {
    const messages = await SquadMessage.find({ squadId: req.params.squadId })
      .populate('postId') // Agar kisi ne post share ki hai, toh post ki details bhi sath aayengi
      .sort({ timestamp: 1 }); // Purane messages upar, naye neeche
    res.json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. Get all squads for a specific user
router.get('/user/:email', async (req, res) => {
  try {
    const userEmail = req.params.email;
    const squads = await Squad.find({ members: userEmail }).sort({ createdAt: -1 });
    res.json({ success: true, squads });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;