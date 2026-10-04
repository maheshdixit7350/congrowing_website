import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:google_fonts/google_fonts.dart';
import '../utils/app_colors.dart';
import '../widgets/bottom_nav_bar.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  static const String profileUrl =
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCCphgPcz225mSJx5UUnQf3LRfEjXZ95vXgbNUEASwrhXMdPjJdc1jIMzYe8ZVAnJrHE9XPJTKaaIC7RL31x-CMLRK1q2j_gXTDwThBkmGWnm6cMkZIvqECe_qkQlMbqDXG39bMZgoxthG5kR4q5GKjFrTJW5QQE14dfrXSzvMaXm483i2bLmBcqEM6eWdf9_EVDjvAox2zd257BJG3v2t9bA41RPKx8tPDN38O7RAjaAFeolU329Idfe3E6MLFxc9rOs20FIOio28';
  static const String yashUrl =
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBNtt_wYgFTJxKDSxoIDe7i6JqU92xxzbjtCGgwtezQZBRakLxLj0PU8b5U9rZcYjB77rhNTOKvgdYVrrcROwDCIb2adTFXXxquIyYKAkIDub7mACH911QYYB6oJhw8yCYE10fFqB89m1dtd0youkatWJrSUmTbcUqj0ssaTSPeUjNy_kbVh-Bn74eVnc1bbUuo7d3yWLzzmE4i_lP10qvxqbQETzg6rpb9llMYYf29taPrR7zMZYJtp-IPQpMSdLcCtKLs0gMHkgw';
  static const String nehaUrl =
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDwUlzZTpEppXDkzGQXTpVsFTIPI-l6L8fBPZbDaXzjVer9-iKxt5aXElMcdxw1KNyU1d3aKUaJ8L0xYVBqdhVgzIZtdUQr6axSah9SlPjCLSZBq9bxEDL5gwFEyNQf9qC-JfSkEOagHbygY7YGqpofmAE2w2FdT_uAeBaUBuYWzeQn9Qs81Jz4RsbUuwz1iqhb5cajpe9GIseqkZ0ZZfp3SnAsnHt2x2k8J3E2Er5-AB-jCZQcuwz1JRPMBd4wTPfRMzLyHnI0ui4';
  static const String jatinUrl =
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCvzpxNzlkNMl4OMTuvqM1f2kxHuWXIhkKNvq_2PhHmotMpL880kJZ69JJZ0d6bsLaMpnoi-LJyBvQ_PI79pO3RDrSPUvCUSsm2-snro_qApZhPPkPUUmfceFh08bLGVVPUXS_k1VY9R-PDH82h6RByM6zMaGTrJHQ_zyicnrtXBk4exltnf4jmRW20cvNs6TV-nLfy_XdmP9YPfnrE_xyfX93uES6-QQ9shV7bJJsvrzZlVU2It1HPapHXLf4eLbisZzq__YGFrss';
  static const String davidUrl =
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAfuha8VGG0BPiBwuldEhiK9YAE0ZJIm3M8NQLRRMrpBGwNbyf7YYtzio6JXwwEC5SKcqFfjg7Aczu0Poy_GmrU4zm7YgZvO4m5vURKmgOtHqYqRKmWvzeO3ElnB_-erPhAy00ddbmEwdiv5Wz66YfB5PvjgK2S390u-8j9MFyWGS6n40kKzw2vCeDkDM6DY_9seyet1uzDAIXG9o12iUI5XSMn7uQ9EAvzJhX9pW6kwZCekMVnS5zMLADilTBQL7Nu3l_cUOtl9bY';
  static const String mayaUrl =
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAGGnQbm1ehPSo92cYwsOLK23IJyCBQwUDE4faKq-R_5y_o0uvALCRrvZ2dzUqSLPUuzco5VF-ax43xaE8bCJLzu0Fp6XRN-2gjZ1BZ5JImcyudet4ygoZ6I6mN5202iTnbQ4HAqCHh_-7_GbU_mythWdepWp7XpSNpdBTnWKurtRXr6xIoIKxflEb9lqQTHJ67--HtYI5aMI1bia6QGBMagllJYfo37AztM5vCcbGH6lO4G07HkfAwl2D-uxNOng6NLBYb0VsLL_I';

  Future<bool> _onWillPop(BuildContext context) async {
    final result = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text('Exit App', style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
        content: Text('Are you sure you want to exit?', style: GoogleFonts.inter()),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text('Cancel', style: GoogleFonts.inter()),
          ),
          TextButton(
            onPressed: () => SystemNavigator.pop(),
            child: Text('Exit', style: GoogleFonts.inter(color: Colors.red, fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
    return result ?? false;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (!didPop) {
          _onWillPop(context);
        }
      },
      child: Scaffold(
        backgroundColor: isDark ? AppColors.backgroundDark : AppColors.backgroundLight,
        body: Column(
          children: [
            Expanded(
              child: CustomScrollView(
                slivers: [
                  // App Bar
                  SliverAppBar(
                    pinned: true,
                    automaticallyImplyLeading: false,
                    backgroundColor: isDark ? AppColors.backgroundDark : AppColors.backgroundLight,
                    title: Row(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: Padding(
                            padding: const EdgeInsets.all(2),
                            child: Image.asset(
                              'assets/images/logo.png',
                              width: 32,
                              height: 32,
                              fit: BoxFit.cover,
                              errorBuilder: (c, e, s) => const SizedBox(width: 32, height: 32),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        ShaderMask(
                          shaderCallback: (bounds) => AppColors.primaryGradient.createShader(bounds),
                          child: Text(
                            'ConGrowing',
                            style: GoogleFonts.inter(
                              fontWeight: FontWeight.w700,
                              fontSize: 20,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ],
                    ),
                    actions: [
                      IconButton(
                        icon: const Icon(Icons.add_box_outlined),
                        onPressed: () => Navigator.pushNamed(context, '/create-post'),
                      ),
                      IconButton(
                        icon: const Icon(Icons.favorite_border_rounded),
                        onPressed: () => Navigator.pushNamed(context, '/notifications'),
                      ),
                    ],
                  ),

                  SliverToBoxAdapter(child: _buildStories(context, isDark)),
                  SliverToBoxAdapter(child: Divider(height: 1, color: isDark ? Colors.grey.shade800 : Colors.grey.shade100)),
                  SliverToBoxAdapter(child: const SizedBox(height: 24)),
                  SliverToBoxAdapter(child: _buildConnectSection(context)),
                  SliverToBoxAdapter(child: const SizedBox(height: 24)),
                  SliverToBoxAdapter(child: _buildLeaderboard(context, isDark)),
                  SliverToBoxAdapter(child: const SizedBox(height: 16)),
                  SliverToBoxAdapter(child: _buildCriAnalytics(context, isDark)),
                  SliverToBoxAdapter(child: const SizedBox(height: 24)),
                ],
              ),
            ),
            BottomNavBar(currentIndex: 0),
          ],
        ),
      ),
    );
  }

  Widget _buildStories(BuildContext context, bool isDark) {
    final stories = [
      {'name': 'Your Story', 'url': profileUrl, 'isSelf': true},
      {'name': 'Yash', 'url': yashUrl, 'isSelf': false},
      {'name': 'Neha', 'url': nehaUrl, 'isSelf': false},
      {'name': 'Jatin', 'url': jatinUrl, 'isSelf': false},
    ];
    return SizedBox(
      height: 100,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        itemCount: stories.length,
        itemBuilder: (ctx, i) {
          final s = stories[i];
          final isSelf = s['isSelf'] as bool;
          return Padding(
            padding: const EdgeInsets.only(right: 16),
            child: Column(
              children: [
                Stack(
                  children: [
                    Container(
                      width: 60,
                      height: 60,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: isSelf ? null : AppColors.primaryGradient,
                        border: isSelf
                            ? Border.all(color: Colors.grey.shade300, width: 2, strokeAlign: BorderSide.strokeAlignOutside)
                            : null,
                      ),
                      padding: isSelf ? null : const EdgeInsets.all(2.5),
                      child: Container(
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: isDark ? AppColors.backgroundDark : AppColors.backgroundLight,
                        ),
                        padding: const EdgeInsets.all(2),
                        child: ClipOval(
                          child: CachedNetworkImage(
                            imageUrl: s['url'] as String,
                            fit: BoxFit.cover,
                          ),
                        ),
                      ),
                    ),
                    if (isSelf)
                      Positioned(
                        bottom: 0,
                        right: 0,
                        child: Container(
                          width: 20,
                          height: 20,
                          decoration: const BoxDecoration(
                            color: AppColors.primary,
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.add, color: Colors.white, size: 14),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  s['name'] as String,
                  style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w500),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildConnectSection(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Connect with People', style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w700)),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: Colors.green.shade50,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: Colors.green.shade200),
                ),
                child: Text('FREE', style: GoogleFonts.inter(color: Colors.green.shade600, fontWeight: FontWeight.w800, fontSize: 11)),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // ── Big Connect Button ─────────────────────────────────────
          GestureDetector(
            onTap: () => Navigator.pushNamed(context, '/call'),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 22),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppColors.primaryGradientStart, AppColors.primaryGradientEnd, Color(0xFF2DD4BF)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(color: AppColors.primary.withOpacity(0.5), blurRadius: 24, offset: const Offset(0, 8)),
                  BoxShadow(color: AppColors.primary.withOpacity(0.2), blurRadius: 40, spreadRadius: 4, offset: const Offset(0, 4)),
                ],
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.videocam_rounded, color: Colors.white, size: 28),
                      const SizedBox(width: 10),
                      Text(
                        'Connect Now',
                        style: GoogleFonts.outfit(
                          color: Colors.white,
                          fontWeight: FontWeight.w800,
                          fontSize: 22,
                          letterSpacing: 0.3,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Meet someone new based on your CRI score',
                    style: GoogleFonts.inter(color: Colors.white.withOpacity(0.8), fontSize: 12, fontWeight: FontWeight.w500),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLeaderboard(BuildContext context, bool isDark) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: isDark ? AppColors.cardDark : AppColors.cardLight,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: isDark ? Colors.grey.shade800 : Colors.grey.shade100),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Leaderboard', style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w700)),
            const SizedBox(height: 20),

            // Top 3 Podium
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                _PodiumItem(rank: 2, name: 'Jatin', hours: '133 hrs', imageUrl: jatinUrl, size: 56, rankColor: Colors.grey.shade400),
                _PodiumItem(rank: 1, name: 'Neha', hours: '150 hrs', imageUrl: nehaUrl, size: 72, rankColor: Colors.amber.shade500),
                _PodiumItem(rank: 3, name: 'Yash', hours: '120 hrs', imageUrl: yashUrl, size: 56, rankColor: Colors.orange.shade400),
              ],
            ),

            const SizedBox(height: 20),

            // Rows 4-5
            _LeaderboardRow(rank: 4, name: 'David', hours: '100 hrs', imageUrl: davidUrl),
            const SizedBox(height: 8),
            _LeaderboardRow(rank: 5, name: 'Maya', hours: '92 hrs', imageUrl: mayaUrl),

            const SizedBox(height: 16),
            GestureDetector(
              onTap: () => Navigator.pushNamed(context, '/leaderboard'),
              child: Center(
                child: Text(
                  'View Full Leaderboard',
                  style: GoogleFonts.inter(
                    color: AppColors.primary,
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCriAnalytics(BuildContext context, bool isDark) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: isDark ? AppColors.cardDark : AppColors.cardLight,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: isDark ? Colors.grey.shade800 : Colors.grey.shade100),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('CRI Analytics', style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w700)),
                const Icon(Icons.insights_rounded, color: AppColors.primary, size: 24),
              ],
            ),
            const SizedBox(height: 16),
            Text(
              'CURRENT CRI SCORE',
              style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.textSecondaryLight, letterSpacing: 1),
            ),
            const SizedBox(height: 6),
            Row(
              children: [
                Text(
                  '850',
                  style: GoogleFonts.inter(
                    fontSize: 48,
                    fontWeight: FontWeight.w800,
                    color: AppColors.primaryGradientStart,
                  ),
                ),
                const SizedBox(width: 10),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.green.shade100,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.trending_up_rounded, color: Colors.green.shade600, size: 14),
                      const SizedBox(width: 3),
                      Text('+12.5%', style: GoogleFonts.inter(color: Colors.green.shade600, fontWeight: FontWeight.w700, fontSize: 10)),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            // Radar chart placeholder
            Center(
              child: CustomPaint(
                size: const Size(200, 200),
                painter: _RadarChartPainter(),
              ),
            ),
            const SizedBox(height: 16),
            GestureDetector(
              onTap: () => Navigator.pushNamed(context, '/cri-analytics'),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 14),
                decoration: BoxDecoration(
                  color: isDark ? Colors.grey.shade800.withOpacity(0.6) : Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Center(
                  child: Text(
                    'View Full Analytics',
                    style: GoogleFonts.inter(color: AppColors.primary, fontWeight: FontWeight.w700, fontSize: 13),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PodiumItem extends StatelessWidget {
  final int rank;
  final String name;
  final String hours;
  final String imageUrl;
  final double size;
  final Color rankColor;

  const _PodiumItem({
    required this.rank,
    required this.name,
    required this.hours,
    required this.imageUrl,
    required this.size,
    required this.rankColor,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Stack(
          clipBehavior: Clip.none,
          children: [
            Container(
              width: size,
              height: size,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: rank == 1
                    ? LinearGradient(colors: [Colors.amber.shade400, Colors.amber.shade600])
                    : null,
                color: rank != 1 ? Colors.grey.shade200 : null,
              ),
              padding: const EdgeInsets.all(2),
              child: ClipOval(child: CachedNetworkImage(imageUrl: imageUrl, fit: BoxFit.cover)),
            ),
            Positioned(
              bottom: -4,
              right: -2,
              child: Container(
                width: rank == 1 ? 24 : 20,
                height: rank == 1 ? 24 : 20,
                decoration: BoxDecoration(color: rankColor, shape: BoxShape.circle, border: Border.all(color: Colors.white, width: 1.5)),
                child: Center(
                  child: Text(
                    '$rank',
                    style: GoogleFonts.inter(color: Colors.white, fontSize: rank == 1 ? 11 : 9, fontWeight: FontWeight.w800),
                  ),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Text(name, style: GoogleFonts.inter(fontSize: rank == 1 ? 13 : 11, fontWeight: FontWeight.w700)),
        Text(hours, style: GoogleFonts.inter(fontSize: rank == 1 ? 11 : 10, color: AppColors.primary, fontWeight: rank == 1 ? FontWeight.w700 : FontWeight.w500)),
      ],
    );
  }
}

class _LeaderboardRow extends StatelessWidget {
  final int rank;
  final String name;
  final String hours;
  final String imageUrl;

  const _LeaderboardRow({required this.rank, required this.name, required this.hours, required this.imageUrl});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: isDark ? Colors.grey.shade800.withOpacity(0.4) : Colors.grey.shade50,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        children: [
          SizedBox(
            width: 20,
            child: Text('$rank', style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.textSecondaryLight)),
          ),
          const SizedBox(width: 10),
          ClipOval(
            child: CachedNetworkImage(imageUrl: imageUrl, width: 32, height: 32, fit: BoxFit.cover),
          ),
          const SizedBox(width: 10),
          Expanded(child: Text(name, style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600))),
          Text(hours, style: GoogleFonts.inter(fontSize: 11, color: AppColors.textSecondaryLight)),
        ],
      ),
    );
  }
}

class _RadarChartPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2 - 20;
    final gridPaint = Paint()
      ..color = Colors.grey.withOpacity(0.2)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 0.8;
    final fillPaint = Paint()
      ..color = const Color(0xFF7C3AED).withOpacity(0.2)
      ..style = PaintingStyle.fill;
    final strokePaint = Paint()
      ..color = const Color(0xFF7C3AED)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5;

    const int sides = 5;
    final double angleStep = (2 * math.pi) / sides;
    const double startAngle = -math.pi / 2;

    for (int ring = 1; ring <= 3; ring++) {
      final r = radius * ring / 3;
      final path = Path();
      for (int i = 0; i < sides; i++) {
        final angle = startAngle + i * angleStep;
        final x = center.dx + r * math.cos(angle);
        final y = center.dy + r * math.sin(angle);
        if (i == 0) path.moveTo(x, y);
        else path.lineTo(x, y);
      }
      path.close();
      canvas.drawPath(path, gridPaint);
    }

    // Draw data polygon
    final scores = [0.85, 0.75, 0.70, 0.80, 0.65];
    final dataPath = Path();
    for (int i = 0; i < sides; i++) {
      final angle = startAngle + i * angleStep;
      final r = radius * scores[i];
      final x = center.dx + r * math.cos(angle);
      final y = center.dy + r * math.sin(angle);
      if (i == 0) dataPath.moveTo(x, y);
      else dataPath.lineTo(x, y);
    }
    dataPath.close();
    canvas.drawPath(dataPath, fillPaint);
    canvas.drawPath(dataPath, strokePaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
