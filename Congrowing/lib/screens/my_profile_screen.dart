import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:google_fonts/google_fonts.dart';
import '../utils/app_colors.dart';
import '../widgets/bottom_nav_bar.dart';

class MyProfileScreen extends StatefulWidget {
  const MyProfileScreen({super.key});

  @override
  State<MyProfileScreen> createState() => _MyProfileScreenState();
}

class _MyProfileScreenState extends State<MyProfileScreen> with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;

  static const profileUrl =
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCCphgPcz225mSJx5UUnQf3LRfEjXZ95vXgbNUEASwrhXMdPjJdc1jIMzYe8ZVAnJrHE9XPJTKaaIC7RL31x-CMLRK1q2j_gXTDwThBkmGWnm6cMkZIvqECe_qkQlMbqDXG39bMZgoxthG5kR4q5GKjFrTJW5QQE14dfrXSzvMaXm483i2bLmBcqEM6eWdf9_EVDjvAox2zd257BJG3v2t9bA41RPKx8tPDN38O7RAjaAFeolU329Idfe3E6MLFxc9rOs20FIOio28';

  static const _postImages = [
    'https://lh3.googleusercontent.com/aida-public/AB6AXuD8UrqwOBfbsCf5lrDTpS9D6QgZO_txqpyUXyixMZGgOfoElyGryLBMX-IxttJ7yLIJjXjh5N5tKzeey_qC4VcXsSi3rD7-OJ54kgn4MuZ3ULxpeD-bcquqqIbOYS6nA8jfUyhpQDKTpRRqFfqNxwtfbLpFjsQnvNaNSNZ4nZoOR-7BLM9cdy_f2QDgEV2R8l_u5geyhXfS7z8ldlLw-g5A4M5Kz9aCAC0qos7iUWUKKWz_BWWhkM16-x5f5ABz-ZLsc0CPII7x3Eo',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDAL2d3jCWd61PuNeE5_AP1HxIIFc9XRovdGVD22H5vgMAuPakbHFwuk4nomQRhx5II7CPcFeb2nTBG6TqMhpx_OPJzsKwvYCCDp-2I2WcXerK6tGBg1jEoSI2kwmZerBlZJqbBZzoh2GIcF3RZD4pQmfG0mhOOXx35o7zdX5Qtv-H7l4b2cBQRSlI6IASI_5yUZr6RRmJWd6U8fcs98dgnTFWflfnrMSzNj-UVt2JCguAkHN2S228yETcbFkXhwPBHKEe--A-8Gt0',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCac3tg7f2AEtqWzXRNnAXsKnCSJexgo987SZs6M0dBjya_yBJzHvkXPfegxAkZLRdgVhVMRY9T-RJgRJb2yg0QwoKCJUSHKkMxDC2UVUZTh_5IJj-TzsSLeCWHz9OR9XQG-_WoT_XrBRaAKDkORrQ6nZ4W4zH5EeQpXOmL5nTDn8KqdAsuQVj19SH_xtahmJ8qKF7jFTYGgRYjz-kExJYPqch0vSeoYE83SUY0d1aJ9Gb8w3YGwlgT-S6WIlTCKWd4Ol2gYAs7AzY',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuB9nquqpc65fSdP0Ub2IkWAXXagJwXPJXmM9cdFhrEBgfJaVKXoZOWb07_Y6PAyE-Lsb14UlGZK0ySW8V0UT_NhWB3ks9WuGdyhXpS42uy13ZLvrO-WhqgnkkjrnNkDQZhNYsIr67OTwcqMlbTziPSHsC7oddAo_Lc0raJcMrchS3LbEosj6baV7pbJPH-g6-57eyj1LGf5mL_6_12pgm9n8x4NO92GF_7W_z6OELWA5RSm1t3FCaF40ybxKN0b9pMYq9j3wUKBFdk',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAoNumcoT3-CdiWd8dCXY_WAqvRvLRLuaffT7li3qp6LUYzgPu4Noqh1gwiOr6gJQ5XNriITBFkyVeZYKVfWkozh8q5c6-WilvLKtPM03EpvgIcraCO42C4AKBrCQRW2sJ_RrG_Z4TVf1Q5jsS94wdHV5GzVqCrCGqK7Exp-k6UELirRj5vj5rq0pn0gUBlz9ykhJfen4LN5FapvoHohWTCfVL2xRXKcdQuGxy57ral1dPRM-usP_Vwm6r5tBa0ffXIw1IgRajAhYY',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBkSPXs9qMbFkeCNKvKrVUlG8dZPsMuWrbRnqd_sknHDVJ31r4ib5SUZl6qRtEqZVglLRRb1FEgmuRc0Zq2Kws5FVFD31ZbK-T4tZ3a1RgInqkB_awXsrdxf2z2UcDFk7lnV9rzd3uXPGtueKhoVW1XebL9QQbZ8-UBPAMCqwYrqxTTgPi3huCwi0kZeM6B4J3Li3k-04TsFc_UwkXxIYrYJmtBGot6KDFuNiAiLuj2Q3UkNqUHGB4eNmhnaEN_hUJQQZ4krlR5zDM',
  ];

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (!didPop) {
          Navigator.pushNamedAndRemoveUntil(context, '/home', (route) => false);
        }
      },
      child: Scaffold(
        backgroundColor: isDark ? AppColors.backgroundDark : AppColors.backgroundLight,
        body: Column(
          children: [
            Expanded(
              child: NestedScrollView(
                headerSliverBuilder: (ctx, inner) => [
                  SliverAppBar(
                    backgroundColor: isDark ? AppColors.backgroundDark : AppColors.backgroundLight,
                    leading: null,
                    automaticallyImplyLeading: false,
                    title: GestureDetector(
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.add_rounded, size: 18),
                          const SizedBox(width: 4),
                          Text('@Sameer Sahu', style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 17)),
                          const Icon(Icons.expand_more_rounded, size: 16),
                        ],
                      ),
                    ),
                    actions: [
                      IconButton(
                        icon: const Icon(Icons.menu_rounded),
                        onPressed: () => Navigator.pushNamed(context, '/settings'),
                      ),
                    ],
                  ),
                SliverToBoxAdapter(
                  child: Column(
                    children: [
                      // Cover photo
                      Container(
                        height: 120,
                        width: double.infinity,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: isDark
                                ? [Colors.grey.shade800, Colors.grey.shade700]
                                : [Colors.grey.shade200, Colors.grey.shade300],
                          ),
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 20),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Transform.translate(
                                  offset: const Offset(0, -40),
                                  child: Container(
                                    width: 90,
                                    height: 90,
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      border: Border.all(
                                        color: isDark ? AppColors.backgroundDark : AppColors.backgroundLight,
                                        width: 4,
                                      ),
                                    ),
                                    child: ClipOval(child: CachedNetworkImage(imageUrl: profileUrl, fit: BoxFit.cover)),
                                  ),
                                ),
                                Padding(
                                  padding: const EdgeInsets.only(bottom: 12),
                                  child: Row(
                                    children: [
                                      GestureDetector(
                                        onTap: () => Navigator.pushNamed(context, '/cri-analytics'),
                                        child: Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                          decoration: BoxDecoration(
                                            color: isDark ? AppColors.cardDark : Colors.white,
                                            borderRadius: BorderRadius.circular(20),
                                            border: Border.all(color: isDark ? Colors.grey.shade700 : Colors.grey.shade200),
                                          ),
                                          child: Row(
                                            children: [
                                              const Icon(Icons.trending_up_rounded, color: AppColors.primary, size: 14),
                                              const SizedBox(width: 4),
                                              ShaderMask(
                                                shaderCallback: (b) => AppColors.primaryGradient.createShader(b),
                                                child: Text('CRI: 850',
                                                    style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 13, color: Colors.white)),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      GestureDetector(
                                        onTap: () => Navigator.pushNamed(context, '/edit-profile'),
                                        child: Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                                          decoration: BoxDecoration(
                                            borderRadius: BorderRadius.circular(20),
                                            border: Border.all(color: isDark ? Colors.grey.shade600 : Colors.grey.shade300),
                                          ),
                                          child: Text('Edit Profile', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w500)),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                            Transform.translate(
                              offset: const Offset(0, -28),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('Sameer Sahu', style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 20)),
                                  Text('@Sameer Sahu',
                                      style: GoogleFonts.inter(color: AppColors.textSecondaryLight, fontSize: 13)),
                                  const SizedBox(height: 8),
                                  Text('B.COM(H) | CU 25', style: GoogleFonts.inter(fontSize: 13)),
                                  Text('ALWAYS DOWN TO EARTH', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600)),
                                ],
                              ),
                            ),
                            // Stats
                            Padding(
                              padding: const EdgeInsets.only(bottom: 16),
                              child: Row(
                                children: [
                                  _StatItem(count: '28', label: 'Posts'),
                                  Container(width: 1, height: 30, color: isDark ? Colors.grey.shade700 : Colors.grey.shade200),
                                  _StatItem(count: '18', label: 'Friends'),
                                  Container(width: 1, height: 30, color: isDark ? Colors.grey.shade700 : Colors.grey.shade200),
                                  _StatItem(count: '240', label: 'Followers'),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                SliverPersistentHeader(
                  pinned: true,
                  delegate: _TabBarDelegate(
                    TabBar(
                      controller: _tabCtrl,
                      indicatorColor: AppColors.primary,
                      labelColor: AppColors.primary,
                      unselectedLabelColor: AppColors.textSecondaryLight,
                      labelStyle: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 13),
                      tabs: const [Tab(text: 'Posts'), Tab(text: 'Videos'), Tab(text: 'Tagged')],
                    ),
                    isDark: isDark,
                  ),
                ),
              ],
              body: TabBarView(
                controller: _tabCtrl,
                children: [
                  GridView.builder(
                    padding: const EdgeInsets.all(0.5),
                    physics: const NeverScrollableScrollPhysics(),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 3,
                      mainAxisSpacing: 0.5,
                      crossAxisSpacing: 0.5,
                    ),
                    itemCount: _postImages.length,
                    itemBuilder: (ctx, i) => CachedNetworkImage(imageUrl: _postImages[i], fit: BoxFit.cover),
                  ),
                  const Center(child: Text('Videos coming soon')),
                  const Center(child: Text('Tagged posts coming soon')),
                ],
              ),
            ),
          ),
          BottomNavBar(currentIndex: 4),
        ],
        ),
      ),
    );
  }
}

class _StatItem extends StatelessWidget {
  final String count;
  final String label;
  const _StatItem({required this.count, required this.label});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Text(count, style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 18)),
          Text(label, style: GoogleFonts.inter(fontSize: 11, color: AppColors.textSecondaryLight)),
        ],
      ),
    );
  }
}

class _TabBarDelegate extends SliverPersistentHeaderDelegate {
  final TabBar tabBar;
  final bool isDark;

  const _TabBarDelegate(this.tabBar, {required this.isDark});

  @override
  double get minExtent => tabBar.preferredSize.height;
  @override
  double get maxExtent => tabBar.preferredSize.height;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    return Container(
      color: isDark ? AppColors.backgroundDark : AppColors.backgroundLight,
      child: tabBar,
    );
  }

  @override
  bool shouldRebuild(covariant SliverPersistentHeaderDelegate oldDelegate) => false;
}
