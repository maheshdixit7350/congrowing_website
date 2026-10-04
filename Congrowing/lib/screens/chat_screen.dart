import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:google_fonts/google_fonts.dart';
import '../utils/app_colors.dart';
import '../utils/nav_utils.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _controller = TextEditingController();
  late List<Map<String, dynamic>> _messages;
  bool _initialized = false;

  // Default fallback data
  String _contactName = 'Kunal';
  String _contactUrl =
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCG_OXZML_Tq2-5z87ascMyUXY628UIlx1XxaSdZ5VxHkOO-2MbzJyepUZznH7mIpZDYYBM_fFhZU_SmGmbPnuXGHEp2EJKCfEpC-JKEgDQAXsWJ5ARyxri9i9TpR6mNYBH_jNSwuq_8aPFjRPaghfU99nD2m3DoXjdfwGOUzhZF_YCs9EruezXIcwTjMnUk8_xx_jEALXt2iVI4EN_FLbveWWxj6j3lU_p10JcuXNYiN3feHy5bc0BuTvyReOJONDn_N77dOk4E04';
  bool _contactOnline = true;

  // Sample message sets for different contacts
  static const _messageData = <String, List<Map<String, dynamic>>>{
    'Kunal': [
      {'sent': false, 'text': 'HI 👋', 'time': '10:30 AM'},
      {'sent': true, 'text': 'Hey Kunal! Kya chal raha hai? 😄', 'time': '10:32 AM'},
      {'sent': false, 'text': 'Sab badhiya bhai! Aaj college mein kya plan hai?', 'time': '10:33 AM'},
      {'sent': true, 'text': 'Canteen mein milte hai 12 baje 🍕', 'time': '10:35 AM'},
      {'sent': false, 'text': 'Perfect! 👍', 'time': '2m ago'},
    ],
    'Neha': [
      {'sent': false, 'text': 'Hey! Notes bhej dena 📚', 'time': '9:00 AM'},
      {'sent': true, 'text': 'Konse subject ke?', 'time': '9:05 AM'},
      {'sent': false, 'text': 'DSA wale, assignment ke liye chahiye', 'time': '9:06 AM'},
      {'sent': true, 'text': 'Ok ruk bhejta hoon 👍', 'time': '9:10 AM'},
      {'sent': false, 'text': 'Haha bilkul! 😂', 'time': '15m'},
    ],
    'Yash': [
      {'sent': true, 'text': 'Bhai gym chalega aaj?', 'time': '8:00 AM'},
      {'sent': false, 'text': 'Haan bhai 6 baje?', 'time': '8:15 AM'},
      {'sent': true, 'text': 'Done! Leg day hai aaj 🏋️', 'time': '8:20 AM'},
      {'sent': false, 'text': 'Aaj canteen mein milte hai', 'time': '1h'},
    ],
    'Jatin': [
      {'sent': false, 'text': 'Project ka deadline extend hua kya?', 'time': 'Yesterday'},
      {'sent': true, 'text': 'Nahi bhai, kal hi submit karna hai 😅', 'time': 'Yesterday'},
      {'sent': false, 'text': 'Bhai kab aayega? 😅', 'time': 'Yesterday'},
    ],
    'David': [
      {'sent': false, 'text': 'Great presentation today!', 'time': 'Yesterday'},
      {'sent': true, 'text': 'Thanks David! Your feedback helped a lot 🙌', 'time': 'Yesterday'},
      {'sent': false, 'text': 'Good work today!', 'time': 'Yesterday'},
    ],
  };

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_initialized) {
      final args = ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
      if (args != null) {
        _contactName = args['name'] as String? ?? _contactName;
        _contactUrl = args['url'] as String? ?? _contactUrl;
        _contactOnline = args['online'] as bool? ?? _contactOnline;
      }
      // Load messages for this contact, or use default
      _messages = List<Map<String, dynamic>>.from(
        _messageData[_contactName] ?? _messageData['Kunal']!,
      );
      _initialized = true;
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _sendMessage() {
    if (_controller.text.trim().isEmpty) return;
    setState(() {
      _messages.add({'sent': true, 'text': _controller.text.trim(), 'time': 'Now'});
      _controller.clear();
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      backgroundColor: isDark ? AppColors.backgroundDark : AppColors.backgroundLight,
      appBar: AppBar(
        backgroundColor: isDark ? AppColors.cardDark : Colors.white,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18),
          onPressed: () => safeNavigateBack(context),
        ),
        title: Row(
          children: [
            Stack(
              children: [
                ClipOval(child: CachedNetworkImage(imageUrl: _contactUrl, width: 40, height: 40, fit: BoxFit.cover)),
                if (_contactOnline)
                  Positioned(
                    bottom: 0,
                    right: 0,
                    child: Container(
                      width: 12,
                      height: 12,
                      decoration: BoxDecoration(
                        color: Colors.green,
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white, width: 1.5),
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(_contactName, style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 15)),
                Text(
                  _contactOnline ? 'Online' : 'Offline',
                  style: GoogleFonts.inter(
                    fontSize: 11,
                    color: _contactOnline ? Colors.green : AppColors.textSecondaryLight,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: AppColors.primary.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.call_rounded, color: AppColors.primary, size: 18),
            ),
            onPressed: () => Navigator.pushNamed(context, '/call'),
          ),
          IconButton(
            icon: Icon(Icons.more_vert_rounded, color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight),
            onPressed: () {},
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              itemCount: _messages.length + 1, // +1 for date header
              itemBuilder: (ctx, i) {
                if (i == 0) {
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: Row(
                      children: [
                        Expanded(child: Container(height: 1, color: isDark ? Colors.grey.shade700 : Colors.grey.shade200)),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          child: Text('Today',
                              style: GoogleFonts.inter(fontSize: 11, color: AppColors.textSecondaryLight, fontWeight: FontWeight.w500)),
                        ),
                        Expanded(child: Container(height: 1, color: isDark ? Colors.grey.shade700 : Colors.grey.shade200)),
                      ],
                    ),
                  );
                }
                final msg = _messages[i - 1];
                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: msg['sent'] as bool ? _SentBubble(msg: msg) : _ReceivedBubble(msg: msg, avatarUrl: _contactUrl, isDark: isDark),
                );
              },
            ),
          ),
          // Typing indicator (only show when contact is online)
          if (_contactOnline)
            Padding(
              padding: const EdgeInsets.only(left: 16, bottom: 8),
              child: Row(
                children: [
                  ClipOval(child: CachedNetworkImage(imageUrl: _contactUrl, width: 28, height: 28, fit: BoxFit.cover)),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.cardDark : Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: isDark ? Colors.grey.shade800 : Colors.grey.shade100),
                    ),
                    child: _TypingDots(),
                  ),
                ],
              ),
            ),
          // Input bar
          Container(
            padding: EdgeInsets.fromLTRB(16, 10, 16, MediaQuery.of(context).padding.bottom + 10),
            decoration: BoxDecoration(
              color: isDark ? AppColors.cardDark : Colors.white,
              border: Border(top: BorderSide(color: isDark ? Colors.grey.shade800 : Colors.grey.shade100)),
            ),
            child: Row(
              children: [
                Icon(Icons.add_circle_outline_rounded, color: AppColors.textSecondaryLight, size: 26),
                const SizedBox(width: 10),
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                    decoration: BoxDecoration(
                      color: isDark ? Colors.grey.shade800 : Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(24),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _controller,
                            style: GoogleFonts.inter(fontSize: 14),
                            decoration: InputDecoration(
                              hintText: 'Type a message...',
                              hintStyle: GoogleFonts.inter(color: AppColors.textSecondaryLight, fontSize: 14),
                              border: InputBorder.none,
                              isDense: true,
                            ),
                            onSubmitted: (_) => _sendMessage(),
                          ),
                        ),
                        const Icon(Icons.mood_rounded, color: AppColors.textSecondaryLight, size: 22),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                GestureDetector(
                  onTap: _sendMessage,
                  child: Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                      gradient: AppColors.primaryGradient,
                      shape: BoxShape.circle,
                      boxShadow: [BoxShadow(color: AppColors.primary.withOpacity(0.35), blurRadius: 12, offset: const Offset(0, 4))],
                    ),
                    child: const Icon(Icons.send_rounded, color: Colors.white, size: 20),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SentBubble extends StatelessWidget {
  final Map<String, dynamic> msg;
  const _SentBubble({required this.msg});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.end,
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Container(
              constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.72),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              decoration: BoxDecoration(
                gradient: AppColors.primaryGradient,
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(20),
                  topRight: Radius.circular(20),
                  bottomLeft: Radius.circular(20),
                  bottomRight: Radius.circular(4),
                ),
              ),
              child: Text(msg['text'] as String, style: GoogleFonts.inter(color: Colors.white, fontSize: 13)),
            ),
            const SizedBox(height: 2),
            Text('${msg['time']} ✓✓', style: GoogleFonts.inter(fontSize: 10, color: AppColors.textSecondaryLight)),
          ],
        ),
      ],
    );
  }
}

class _ReceivedBubble extends StatelessWidget {
  final Map<String, dynamic> msg;
  final String avatarUrl;
  final bool isDark;
  const _ReceivedBubble({required this.msg, required this.avatarUrl, required this.isDark});

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        ClipOval(child: CachedNetworkImage(imageUrl: avatarUrl, width: 28, height: 28, fit: BoxFit.cover)),
        const SizedBox(width: 8),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.72),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              decoration: BoxDecoration(
                color: isDark ? AppColors.cardDark : Colors.white,
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(20),
                  topRight: Radius.circular(20),
                  bottomLeft: Radius.circular(4),
                  bottomRight: Radius.circular(20),
                ),
                border: Border.all(color: isDark ? Colors.grey.shade800 : Colors.grey.shade100),
              ),
              child: Text(msg['text'] as String, style: GoogleFonts.inter(fontSize: 13)),
            ),
            const SizedBox(height: 2),
            Text(msg['time'] as String, style: GoogleFonts.inter(fontSize: 10, color: AppColors.textSecondaryLight)),
          ],
        ),
      ],
    );
  }
}

class _TypingDots extends StatefulWidget {
  @override
  State<_TypingDots> createState() => _TypingDotsState();
}

class _TypingDotsState extends State<_TypingDots> with TickerProviderStateMixin {
  late List<AnimationController> _controllers;
  late List<Animation<double>> _anims;

  @override
  void initState() {
    super.initState();
    _controllers = List.generate(3, (i) {
      final c = AnimationController(vsync: this, duration: const Duration(milliseconds: 600));
      Future.delayed(Duration(milliseconds: i * 150), () {
        if (mounted) c.repeat(reverse: true);
      });
      return c;
    });
    _anims = _controllers.map((c) => Tween(begin: 0.0, end: -6.0).animate(CurvedAnimation(parent: c, curve: Curves.easeInOut))).toList();
  }

  @override
  void dispose() {
    for (final c in _controllers) c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(3, (i) {
        return AnimatedBuilder(
          animation: _anims[i],
          builder: (_, __) => Transform.translate(
            offset: Offset(0, _anims[i].value),
            child: Container(
              margin: const EdgeInsets.symmetric(horizontal: 2),
              width: 8,
              height: 8,
              decoration: const BoxDecoration(color: Colors.grey, shape: BoxShape.circle),
            ),
          ),
        );
      }),
    );
  }
}
