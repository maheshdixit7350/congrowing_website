import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:google_fonts/google_fonts.dart';
import '../utils/app_colors.dart';
import '../widgets/bottom_nav_bar.dart';

// ─── Data Models ──────────────────────────────────────────────────────────────
class _Person {
  final String name;
  final String imageUrl;
  final int cri;
  final int compatibility;
  final String topic;
  final bool isOnline;
  _Person({required this.name, required this.imageUrl, required this.cri, required this.compatibility, required this.topic, required this.isOnline});
}

class _Podcast {
  final String title;
  final String category;
  final String imageUrl;
  final String listeners;
  final bool isLive;
  _Podcast({required this.title, required this.category, required this.imageUrl, required this.listeners, required this.isLive});
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
class CallScreen extends StatefulWidget {
  const CallScreen({super.key});
  @override
  State<CallScreen> createState() => _CallScreenState();
}

class _CallScreenState extends State<CallScreen> with TickerProviderStateMixin {
  late AnimationController _pulseController;
  late AnimationController _shimmerController;
  final TextEditingController _searchController = TextEditingController();

  String _selectedCategory = 'All';
  final List<String> _categories = ['All', 'Tech', 'Business', 'Lifestyle', 'Language', 'Science'];

  final List<_Person> _allPeople = [
    _Person(name: 'Elena R.', imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDwUlzZTpEppXDkzGQXTpVsFTIPI-l6L8fBPZbDaXzjVer9-iKxt5aXElMcdxw1KNyU1d3aKUaJ8L0xYVBqdhVgzIZtdUQr6axSah9SlPjCLSZBq9bxEDL5gwFEyNQf9qC-JfSkEOagHbygY7YGqpofmAE2w2FdT_uAeBaUBuYWzeQn9Qs81Jz4RsbUuwz1iqhb5cajpe9GIseqkZ0ZZfp3SnAsnHt2x2k8J3E2Er5-AB-jCZQcuwz1JRPMBd4wTPfRMzLyHnI0ui4', cri: 835, compatibility: 98, topic: 'AI & Future Tech', isOnline: true),
    _Person(name: 'Arjun M.', imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBNtt_wYgFTJxKDSxoIDe7i6JqU92xxzbjtCGgwtezQZBRakLxLj0PU8b5U9rZcYjB77rhNTOKvgdYVrrcROwDCIb2adTFXXxquIyYKAkIDub7mACH911QYYB6oJhw8yCYE10fFqB89m1dtd0youkatWJrSUmTbcUqj0ssaTSPeUjNy_kbVh-Bn74eVnc1bbUuo7d3yWLzzmE4i_lP10qvxqbQETzg6rpb9llMYYf29taPrR7zMZYJtp-IPQpMSdLcCtKLs0gMHkgw', cri: 810, compatibility: 91, topic: 'Entrepreneurship', isOnline: true),
    _Person(name: 'Sofia L.', imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCCphgPcz225mSJx5UUnQf3LRfEjXZ95vXgbNUEASwrhXMdPjJdc1jIMzYe8ZVAnJrHE9XPJTKaaIC7RL31x-CMLRK1q2j_gXTDwThBkmGWnm6cMkZIvqECe_qkQlMbqDXG39bMZgoxthG5kR4q5GKjFrTJW5QQE14dfrXSzvMaXm483i2bLmBcqEM6eWdf9_EVDjvAox2zd257BJG3v2t9bA41RPKx8tPDN38O7RAjaAFeolU329Idfe3E6MLFxc9rOs20FIOio28', cri: 790, compatibility: 85, topic: 'Language Learning', isOnline: false),
    _Person(name: 'David K.', imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAfuha8VGG0BPiBwuldEhiK9YAE0ZJIm3M8NQLRRMrpBGwNbyf7YYtzio6JXwwEC5SKcqFfjg7Aczu0Poy_GmrU4zm7YgZvO4m5vURKmgOtHqYqRKmWvzeO3ElnB_-erPhAy00ddbmEwdiv5Wz66YfB5PvjgK2S390u-8j9MFyWGS6n40kKzw2vCeDkDM6DY_9seyet1uzDAIXG9o12iUI5XSMn7uQ9EAvzJhX9pW6kwZCekMVnS5zMLADilTBQL7Nu3l_cUOtl9bY', cri: 765, compatibility: 79, topic: 'Finance & Investing', isOnline: true),
  ];

  final List<_Podcast> _podcasts = [
    _Podcast(title: 'Tamil Tigers', category: 'Geopolitics', imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBNtt_wYgFTJxKDSxoIDe7i6JqU92xxzbjtCGgwtezQZBRakLxLj0PU8b5U9rZcYjB77rhNTOKvgdYVrrcROwDCIb2adTFXXxquIyYKAkIDub7mACH911QYYB6oJhw8yCYE10fFqB89m1dtd0youkatWJrSUmTbcUqj0ssaTSPeUjNy_kbVh-Bn74eVnc1bbUuo7d3yWLzzmE4i_lP10qvxqbQETzg6rpb9llMYYf29taPrR7zMZYJtp-IPQpMSdLcCtKLs0gMHkgw', listeners: '1.2k', isLive: true),
    _Podcast(title: 'Global Talk', category: 'World News', imageUrl: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=500&auto=format&fit=crop&q=60', listeners: '856', isLive: false),
    _Podcast(title: 'English Hub', category: 'Language', imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAGGnQbm1ehPSo92cYwsOLK23IJyCBQwUDE4faKq-R_5y_o0uvALCRrvZ2dzUqSLPUuzco5VF-ax43xaE8bCJLzu0Fp6XRN-2gjZ1BZ5JImcyudet4ygoZ6I6mN5202iTnbQ4HAqCHh_-7_GbU_mythWdepWp7XpSNpdBTnWKurtRXr6xIoIKxflEb9lqQTHJ67--HtYI5aMI1bia6QGBMagllJYfo37AztM5vCcbGH6lO4G07HkfAwl2D-uxNOng6NLBYb0VsLL_I', listeners: '2.4k', isLive: true),
    _Podcast(title: 'StartupSpark', category: 'Business', imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCvzpxNzlkNMl4OMTuvqM1f2kxHuWXIhkKNvq_2PhHmotMpL880kJZ69JJZ0d6bsLaMpnoi-LJyBvQ_PI79pO3RDrSPUvCUSsm2-snro_qApZhPPkPUUmfceFh08bLGVVPUXS_k1VY9R-PDH82h6RByM6zMaGTrJHQ_zyicnrtXBk4exltnf4jmRW20cvNs6TV-nLfy_XdmP9YPfnrE_xyfX93uES6-QQ9shV7bJJsvrzZlVU2It1HPapHXLf4eLbisZzq__YGFrss', listeners: '3.1k', isLive: false),
  ];

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(vsync: this, duration: const Duration(seconds: 2))..repeat(reverse: true);
    _shimmerController = AnimationController(vsync: this, duration: const Duration(milliseconds: 1500))..repeat();
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _shimmerController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  void _showConnectDialog(BuildContext context, _Person person) {
    showDialog(
      context: context,
      barrierColor: Colors.black.withOpacity(0.7),
      builder: (_) => Dialog(
        backgroundColor: Colors.transparent,
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(28),
            gradient: const LinearGradient(
              colors: [Color(0xFF1E293B), Color(0xFF0F172A)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            border: Border.all(color: Colors.white.withOpacity(0.1), width: 1.5),
            boxShadow: [BoxShadow(color: AppColors.primary.withOpacity(0.3), blurRadius: 30, spreadRadius: 2)],
          ),
          padding: const EdgeInsets.all(28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 80, height: 80,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: const LinearGradient(colors: [AppColors.primary, Color(0xFF2DD4BF)]),
                ),
                padding: const EdgeInsets.all(3),
                child: ClipOval(child: CachedNetworkImage(imageUrl: person.imageUrl, fit: BoxFit.cover)),
              ),
              const SizedBox(height: 16),
              Text('Connect with ${person.name}?', style: GoogleFonts.outfit(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              Text('${person.compatibility}% compatibility · CRI ${person.cri}', style: GoogleFonts.inter(color: Colors.white60, fontSize: 14)),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(color: const Color(0xFF2DD4BF).withOpacity(0.15), borderRadius: BorderRadius.circular(20)),
                child: Text('Topic: ${person.topic}', style: GoogleFonts.inter(color: const Color(0xFF2DD4BF), fontWeight: FontWeight.w600, fontSize: 13)),
              ),
              const SizedBox(height: 24),
              Row(
                children: [
                  Expanded(
                    child: TextButton(
                      onPressed: () => Navigator.pop(context),
                      style: TextButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: BorderSide(color: Colors.white.withOpacity(0.2))),
                      ),
                      child: Text('Cancel', style: GoogleFonts.inter(color: Colors.white60, fontWeight: FontWeight.w600)),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 2,
                    child: Container(
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(16),
                        gradient: const LinearGradient(colors: [AppColors.primary, Color(0xFF2DD4BF)]),
                        boxShadow: [BoxShadow(color: AppColors.primary.withOpacity(0.4), blurRadius: 12, offset: const Offset(0, 4))],
                      ),
                      child: Material(
                        color: Colors.transparent,
                        child: InkWell(
                          borderRadius: BorderRadius.circular(16),
                          onTap: () {
                            Navigator.pop(context);
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text('Connecting with ${person.name}…', style: GoogleFonts.inter(fontWeight: FontWeight.w600)),
                                backgroundColor: AppColors.primary,
                                behavior: SnackBarBehavior.floating,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                            );
                          },
                          child: Padding(
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(Icons.videocam_rounded, color: Colors.white, size: 18),
                                const SizedBox(width: 8),
                                Text('Start Call', style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 15)),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showFilterSheet(BuildContext context, bool isDark) {
    String tempCat = _selectedCategory;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => StatefulBuilder(
        builder: (ctx, setBS) => Container(
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1E293B) : Colors.white,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
          ),
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey.shade400, borderRadius: BorderRadius.circular(4)))),
              const SizedBox(height: 20),
              Text('Filter By Interest', style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.w700, color: isDark ? Colors.white : const Color(0xFF1E293B))),
              const SizedBox(height: 16),
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: _categories.map((cat) {
                  final sel = tempCat == cat;
                  return GestureDetector(
                    onTap: () => setBS(() => tempCat = cat),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(20),
                        gradient: sel ? const LinearGradient(colors: [AppColors.primary, Color(0xFF2DD4BF)]) : null,
                        color: sel ? null : (isDark ? const Color(0xFF0F172A) : const Color(0xFFF1F5F9)),
                        boxShadow: sel ? [BoxShadow(color: AppColors.primary.withOpacity(0.3), blurRadius: 8, offset: const Offset(0, 3))] : [],
                      ),
                      child: Text(cat, style: GoogleFonts.inter(color: sel ? Colors.white : (isDark ? Colors.white70 : Colors.black87), fontWeight: sel ? FontWeight.w700 : FontWeight.w500)),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(16),
                    gradient: const LinearGradient(colors: [AppColors.primary, Color(0xFF2DD4BF)]),
                  ),
                  child: Material(
                    color: Colors.transparent,
                    child: InkWell(
                      borderRadius: BorderRadius.circular(16),
                      onTap: () {
                        setState(() => _selectedCategory = tempCat);
                        Navigator.pop(context);
                      },
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        child: Center(child: Text('Apply Filter', style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 16))),
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }

  void _showPodcastSheet(BuildContext context, _Podcast pod, bool isDark) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => Container(
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF1E293B) : Colors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
        ),
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey.shade400, borderRadius: BorderRadius.circular(4)))),
            const SizedBox(height: 20),
            ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: CachedNetworkImage(imageUrl: pod.imageUrl, height: 120, width: double.infinity, fit: BoxFit.cover),
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(pod.title, style: GoogleFonts.outfit(fontSize: 22, fontWeight: FontWeight.w700, color: isDark ? Colors.white : const Color(0xFF1E293B))),
                  Text(pod.category, style: GoogleFonts.inter(fontSize: 14, color: isDark ? Colors.white54 : Colors.grey.shade600)),
                ]),
                if (pod.isLive)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(color: Colors.red, borderRadius: BorderRadius.circular(20)),
                    child: Text('● LIVE', style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 11)),
                  ),
              ],
            ),
            const SizedBox(height: 8),
            Row(children: [
              const Icon(Icons.headphones_rounded, size: 16, color: AppColors.primary),
              const SizedBox(width: 6),
              Text('${pod.listeners} listeners', style: GoogleFonts.inter(color: AppColors.primary, fontWeight: FontWeight.w600, fontSize: 14)),
            ]),
            const SizedBox(height: 20),
            Row(children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.headphones_rounded),
                  label: Text('Listen', style: GoogleFonts.inter(fontWeight: FontWeight.w600)),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    side: const BorderSide(color: AppColors.primary),
                    foregroundColor: AppColors.primary,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(14),
                    gradient: const LinearGradient(colors: [AppColors.primary, Color(0xFF2DD4BF)]),
                  ),
                  child: Material(
                    color: Colors.transparent,
                    child: InkWell(
                      borderRadius: BorderRadius.circular(14),
                      onTap: () {
                        Navigator.pop(context);
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text('Joining ${pod.title}…', style: GoogleFonts.inter(fontWeight: FontWeight.w600)),
                            backgroundColor: AppColors.primary,
                            behavior: SnackBarBehavior.floating,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                        );
                      },
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        child: Center(child: Text('Join Now', style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.w700))),
                      ),
                    ),
                  ),
                ),
              ),
            ]),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg = isDark ? const Color(0xFF0B1120) : const Color(0xFFF4F6FB);
    final cardBg = isDark ? const Color(0xFF1A2540) : Colors.white;

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (!didPop) Navigator.pushNamedAndRemoveUntil(context, '/home', (r) => false);
      },
      child: Scaffold(
        backgroundColor: bg,
        body: Column(
          children: [
            // ── Premium AppBar ──────────────────────────────────────────
            _buildAppBar(isDark),

            Expanded(
              child: SingleChildScrollView(
                physics: const BouncingScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Search Bar
                    _buildSearchBar(isDark),
                    const SizedBox(height: 20),

                    // Category chips
                    _buildCategoryChips(isDark),
                    const SizedBox(height: 28),

                    // Top Match Card
                    _buildSectionTitle('Top Match For You', isDark, badge: 'LIVE'),
                    const SizedBox(height: 14),
                    _buildTopMatchCard(_allPeople[0], isDark, cardBg),
                    const SizedBox(height: 32),

                    // People Nearby
                    _buildSectionTitle('People Online Now', isDark),
                    const SizedBox(height: 14),
                    ..._allPeople.skip(1).map((p) => _buildPersonTile(context, p, isDark, cardBg)),
                    const SizedBox(height: 32),

                    // Trending Podcasts
                    _buildSectionTitle('Trending Podcasts', isDark, action: 'View All'),
                    const SizedBox(height: 14),
                    SizedBox(
                      height: 170,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        physics: const BouncingScrollPhysics(),
                        itemCount: _podcasts.length,
                        separatorBuilder: (_, __) => const SizedBox(width: 14),
                        itemBuilder: (ctx, i) => _buildPodcastCard(ctx, _podcasts[i], isDark, cardBg),
                      ),
                    ),
                    const SizedBox(height: 32),

                    // Host CTA
                    _buildHostCTA(isDark, cardBg),
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ),
            BottomNavBar(currentIndex: 1),
          ],
        ),
      ),
    );
  }

  // ── AppBar ────────────────────────────────────────────────────────────────
  Widget _buildAppBar(bool isDark) {
    return Container(
      padding: EdgeInsets.only(top: MediaQuery.of(context).padding.top + 8, left: 20, right: 16, bottom: 12),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF0B1120) : const Color(0xFFF4F6FB),
      ),
      child: Row(
        children: [
          ShaderMask(
            shaderCallback: (b) => const LinearGradient(colors: [AppColors.primary, Color(0xFF2DD4BF)]).createShader(b),
            child: Text('Connect', style: GoogleFonts.outfit(fontSize: 28, fontWeight: FontWeight.w800, color: Colors.white, letterSpacing: -0.5)),
          ),
          const Spacer(),
          _iconBtn(Icons.person_add_alt_1_rounded, isDark, onTap: () {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Invite friends coming soon!', style: GoogleFonts.inter(fontWeight: FontWeight.w600)), backgroundColor: AppColors.primary, behavior: SnackBarBehavior.floating, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
            );
          }),
          const SizedBox(width: 8),
          _iconBtn(Icons.notifications_none_rounded, isDark, onTap: () => Navigator.pushNamed(context, '/notifications')),
        ],
      ),
    );
  }

  Widget _iconBtn(IconData icon, bool isDark, {required VoidCallback onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: isDark ? Colors.white.withOpacity(0.06) : Colors.black.withOpacity(0.04),
        ),
        child: Icon(icon, color: isDark ? Colors.white : const Color(0xFF1E293B), size: 22),
      ),
    );
  }

  // ── Search Bar ────────────────────────────────────────────────────────────
  Widget _buildSearchBar(bool isDark) {
    return Container(
      height: 52,
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1A2540) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(isDark ? 0.25 : 0.06), blurRadius: 16, offset: const Offset(0, 4))],
        border: Border.all(color: isDark ? Colors.white.withOpacity(0.08) : Colors.grey.withOpacity(0.12)),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: [
          Icon(Icons.search_rounded, color: isDark ? Colors.white38 : Colors.grey.shade400, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search people, podcasts…',
                hintStyle: GoogleFonts.inter(color: isDark ? Colors.white38 : Colors.grey.shade400, fontSize: 14),
                border: InputBorder.none,
                isDense: true,
              ),
              style: GoogleFonts.inter(color: isDark ? Colors.white : Colors.black87, fontSize: 14),
            ),
          ),
          GestureDetector(
            onTap: () => ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Voice search coming soon!', style: GoogleFonts.inter(fontWeight: FontWeight.w600)), backgroundColor: AppColors.primary, behavior: SnackBarBehavior.floating, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
            ),
            child: Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(color: AppColors.primary.withOpacity(0.12), borderRadius: BorderRadius.circular(8)),
              child: const Icon(Icons.mic_rounded, color: AppColors.primary, size: 17),
            ),
          ),
        ],
      ),
    );
  }

  // ── Category Chips ────────────────────────────────────────────────────────
  Widget _buildCategoryChips(bool isDark) {
    return SizedBox(
      height: 36,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        physics: const BouncingScrollPhysics(),
        itemCount: _categories.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (_, i) {
          final cat = _categories[i];
          final sel = _selectedCategory == cat;
          return GestureDetector(
            onTap: () => setState(() => _selectedCategory = cat),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(20),
                gradient: sel ? const LinearGradient(colors: [AppColors.primary, Color(0xFF2DD4BF)]) : null,
                color: sel ? null : (isDark ? const Color(0xFF1A2540) : Colors.white),
                border: Border.all(color: sel ? Colors.transparent : (isDark ? Colors.white.withOpacity(0.08) : Colors.grey.withOpacity(0.15))),
                boxShadow: sel ? [BoxShadow(color: AppColors.primary.withOpacity(0.3), blurRadius: 8, offset: const Offset(0, 3))] : [],
              ),
              child: Text(cat, style: GoogleFonts.inter(color: sel ? Colors.white : (isDark ? Colors.white60 : Colors.black54), fontWeight: sel ? FontWeight.w700 : FontWeight.w500, fontSize: 13)),
            ),
          );
        },
      ),
    );
  }

  // ── Section Header ────────────────────────────────────────────────────────
  Widget _buildSectionTitle(String title, bool isDark, {String? badge, String? action}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Row(children: [
          Text(title, style: GoogleFonts.outfit(fontSize: 19, fontWeight: FontWeight.w700, color: isDark ? Colors.white : const Color(0xFF1E293B))),
          if (badge != null) ...[
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(color: Colors.red, borderRadius: BorderRadius.circular(20)),
              child: Text(badge, style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 10, letterSpacing: 0.5)),
            ),
          ],
        ]),
        if (action != null)
          Text(action, style: GoogleFonts.inter(color: AppColors.primary, fontWeight: FontWeight.w600, fontSize: 13)),
      ],
    );
  }

  // ── Top Match Card ────────────────────────────────────────────────────────
  Widget _buildTopMatchCard(_Person person, bool isDark, Color cardBg) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        color: cardBg,
        border: Border.all(color: isDark ? Colors.white.withOpacity(0.08) : Colors.grey.withOpacity(0.08)),
        boxShadow: [BoxShadow(color: AppColors.primary.withOpacity(0.1), blurRadius: 24, offset: const Offset(0, 8))],
      ),
      child: Column(
        children: [
          // Gradient header with avatar
          Container(
            height: 90,
            decoration: BoxDecoration(
              borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
              gradient: LinearGradient(
                colors: isDark
                    ? [const Color(0xFF1E293B), const Color(0xFF0F172A)]
                    : [const Color(0xFFEDE9FE), const Color(0xFFD1FAE5)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
            child: Align(
              alignment: Alignment.bottomLeft,
              child: Padding(
                padding: const EdgeInsets.only(left: 24, bottom: 0),
                child: AnimatedBuilder(
                  animation: _pulseController,
                  builder: (_, __) => Transform.translate(
                    offset: Offset(0, 30),
                    child: Container(
                      padding: EdgeInsets.all(2.5 + _pulseController.value * 2.5),
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: const LinearGradient(colors: [AppColors.primary, Color(0xFF2DD4BF)]),
                        boxShadow: [BoxShadow(color: AppColors.primary.withOpacity(0.35 * _pulseController.value), blurRadius: 16, spreadRadius: 2)],
                      ),
                      child: Container(
                        width: 72, height: 72,
                        padding: const EdgeInsets.all(3),
                        decoration: BoxDecoration(shape: BoxShape.circle, color: cardBg),
                        child: ClipOval(child: CachedNetworkImage(imageUrl: person.imageUrl, fit: BoxFit.cover)),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),

          Padding(
            padding: const EdgeInsets.fromLTRB(24, 44, 24, 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(person.name, style: GoogleFonts.outfit(fontSize: 22, fontWeight: FontWeight.w700, color: isDark ? Colors.white : const Color(0xFF1E293B))),
                      const SizedBox(height: 4),
                      Row(children: [
                        Icon(Icons.workspace_premium_rounded, size: 14, color: Colors.amber.shade500),
                        const SizedBox(width: 4),
                        Text('CRI ${person.cri}', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w700, color: isDark ? Colors.white60 : Colors.black54)),
                        const SizedBox(width: 8),
                        Container(width: 4, height: 4, decoration: BoxDecoration(shape: BoxShape.circle, color: isDark ? Colors.white30 : Colors.grey.shade400)),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(color: const Color(0xFF10B981).withOpacity(0.15), borderRadius: BorderRadius.circular(6)),
                          child: Row(children: [
                            Container(width: 6, height: 6, decoration: const BoxDecoration(shape: BoxShape.circle, color: Color(0xFF10B981))),
                            const SizedBox(width: 4),
                            Text('Online', style: GoogleFonts.inter(color: const Color(0xFF10B981), fontWeight: FontWeight.w600, fontSize: 11)),
                          ]),
                        ),
                      ]),
                    ]),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(colors: [AppColors.primary, Color(0xFF2DD4BF)]),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text('${person.compatibility}% Match', style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 12)),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(color: AppColors.primary.withOpacity(0.08), borderRadius: BorderRadius.circular(8)),
                  child: Row(mainAxisSize: MainAxisSize.min, children: [
                    const Icon(Icons.topic_rounded, size: 13, color: AppColors.primary),
                    const SizedBox(width: 5),
                    Text(person.topic, style: GoogleFonts.inter(color: AppColors.primary, fontWeight: FontWeight.w600, fontSize: 12)),
                  ]),
                ),
                const SizedBox(height: 20),

                // ─── BIG CONNECT BUTTON ─────────────────────────────────
                GestureDetector(
                  onTap: () => _showConnectDialog(context, person),
                  child: Container(
                    width: double.infinity,
                    height: 60,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(20),
                      gradient: const LinearGradient(colors: [AppColors.primary, Color(0xFF2DD4BF)], begin: Alignment.centerLeft, end: Alignment.centerRight),
                      boxShadow: [BoxShadow(color: AppColors.primary.withOpacity(0.45), blurRadius: 18, offset: const Offset(0, 6))],
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.videocam_rounded, color: Colors.white, size: 24),
                        const SizedBox(width: 10),
                        Text('Connect Now', style: GoogleFonts.outfit(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 18, letterSpacing: 0.3)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── Person Tile ───────────────────────────────────────────────────────────
  Widget _buildPersonTile(BuildContext context, _Person person, bool isDark, Color cardBg) {
    return GestureDetector(
      onTap: () => _showConnectDialog(context, person),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: cardBg,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: isDark ? Colors.white.withOpacity(0.06) : Colors.grey.withOpacity(0.1)),
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(isDark ? 0.2 : 0.04), blurRadius: 12, offset: const Offset(0, 4))],
        ),
        child: Row(
          children: [
            Stack(
              children: [
                Container(
                  width: 54, height: 54,
                  decoration: BoxDecoration(shape: BoxShape.circle, gradient: const LinearGradient(colors: [AppColors.primary, Color(0xFF2DD4BF)])),
                  padding: const EdgeInsets.all(2),
                  child: ClipOval(child: CachedNetworkImage(imageUrl: person.imageUrl, fit: BoxFit.cover)),
                ),
                if (person.isOnline)
                  Positioned(
                    bottom: 1, right: 1,
                    child: Container(
                      width: 13, height: 13,
                      decoration: BoxDecoration(color: const Color(0xFF10B981), shape: BoxShape.circle, border: Border.all(color: cardBg, width: 2)),
                    ),
                  ),
              ],
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(person.name, style: GoogleFonts.outfit(fontSize: 15, fontWeight: FontWeight.w700, color: isDark ? Colors.white : const Color(0xFF1E293B))),
                  const SizedBox(height: 2),
                  Text(person.topic, style: GoogleFonts.inter(fontSize: 12, color: isDark ? Colors.white54 : Colors.grey.shade600)),
                  const SizedBox(height: 4),
                  Row(children: [
                    Icon(Icons.workspace_premium_rounded, size: 12, color: Colors.amber.shade500),
                    const SizedBox(width: 3),
                    Text('CRI ${person.cri}', style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600, color: isDark ? Colors.white54 : Colors.black54)),
                  ]),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: [AppColors.primary, Color(0xFF2DD4BF)]),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text('${person.compatibility}%', style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 12)),
            ),
            const SizedBox(width: 10),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(shape: BoxShape.circle, color: AppColors.primary.withOpacity(0.1)),
              child: const Icon(Icons.videocam_rounded, color: AppColors.primary, size: 18),
            ),
          ],
        ),
      ),
    );
  }

  // ── Podcast Card ──────────────────────────────────────────────────────────
  Widget _buildPodcastCard(BuildContext context, _Podcast pod, bool isDark, Color cardBg) {
    return GestureDetector(
      onTap: () => _showPodcastSheet(context, pod, isDark),
      child: Container(
        width: 148,
        decoration: BoxDecoration(
          color: cardBg,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: isDark ? Colors.white.withOpacity(0.06) : Colors.grey.withOpacity(0.1)),
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(isDark ? 0.2 : 0.04), blurRadius: 12, offset: const Offset(0, 4))],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Stack(
              children: [
                ClipRRect(
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
                  child: CachedNetworkImage(imageUrl: pod.imageUrl, height: 95, width: double.infinity, fit: BoxFit.cover),
                ),
                if (pod.isLive)
                  Positioned(
                    top: 8, left: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                      decoration: BoxDecoration(color: Colors.red, borderRadius: BorderRadius.circular(8)),
                      child: Text('LIVE', style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 10)),
                    ),
                  ),
                Positioned(
                  top: 8, right: 8,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                    decoration: BoxDecoration(color: Colors.black.withOpacity(0.55), borderRadius: BorderRadius.circular(8)),
                    child: Row(mainAxisSize: MainAxisSize.min, children: [
                      const Icon(Icons.headphones_rounded, color: Colors.white, size: 10),
                      const SizedBox(width: 3),
                      Text(pod.listeners, style: GoogleFonts.inter(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w600)),
                    ]),
                  ),
                ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(pod.title, style: GoogleFonts.outfit(fontSize: 13, fontWeight: FontWeight.w700, color: isDark ? Colors.white : const Color(0xFF1E293B)), maxLines: 1, overflow: TextOverflow.ellipsis),
                  const SizedBox(height: 2),
                  Text(pod.category, style: GoogleFonts.inter(fontSize: 10, color: isDark ? Colors.white54 : Colors.grey.shade600)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── Host CTA ────────────────────────────────────────────────────────────
  Widget _buildHostCTA(bool isDark, Color cardBg) {
    return GestureDetector(
      onTap: () => ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Podcast creation coming soon!', style: GoogleFonts.inter(fontWeight: FontWeight.w600)), backgroundColor: AppColors.primary, behavior: SnackBarBehavior.floating, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
      ),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(24),
          gradient: LinearGradient(
            colors: isDark ? [const Color(0xFF1A2540), const Color(0xFF0B1120)] : [const Color(0xFFEDE9FE), const Color(0xFFD1FAE5)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          border: Border.all(color: isDark ? Colors.white.withOpacity(0.06) : AppColors.primary.withOpacity(0.1)),
        ),
        child: Row(
          children: [
            Container(
              width: 52, height: 52,
              decoration: BoxDecoration(shape: BoxShape.circle, color: AppColors.primary.withOpacity(0.12)),
              child: const Icon(Icons.mic_external_on_rounded, color: AppColors.primary, size: 26),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Start Your Own Podcast', style: GoogleFonts.outfit(fontSize: 15, fontWeight: FontWeight.w700, color: isDark ? Colors.white : const Color(0xFF1E293B))),
                  const SizedBox(height: 3),
                  Text('Share your ideas with the world.', style: GoogleFonts.inter(fontSize: 12, color: isDark ? Colors.white54 : Colors.grey.shade600)),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: const BoxDecoration(color: AppColors.primary, shape: BoxShape.circle),
              child: const Icon(Icons.arrow_forward_rounded, color: Colors.white, size: 18),
            ),
          ],
        ),
      ),
    );
  }
}
