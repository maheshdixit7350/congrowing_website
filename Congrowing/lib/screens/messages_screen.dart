import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:google_fonts/google_fonts.dart';
import '../utils/app_colors.dart';
import '../widgets/bottom_nav_bar.dart';

class MessagesScreen extends StatelessWidget {
  const MessagesScreen({super.key});

  static const _conversations = [
    {
      'name': 'Kunal',
      'last': 'Perfect! 👍',
      'time': '2m ago',
      'unread': 0,
      'online': true,
      'url': 'https://lh3.googleusercontent.com/aida-public/AB6AXuCG_OXZML_Tq2-5z87ascMyUXY628UIlx1XxaSdZ5VxHkOO-2MbzJyepUZznH7mIpZDYYBM_fFhZU_SmGmbPnuXGHEp2EJKCfEpC-JKEgDQAXsWJ5ARyxri9i9TpR6mNYBH_jNSwuq_8aPFjRPaghfU99nD2m3DoXjdfwGOUzhZF_YCs9EruezXIcwTjMnUk8_xx_jEALXt2iVI4EN_FLbveWWxj6j3lU_p10JcuXNYiN3feHy5bc0BuTvyReOJONDn_N77dOk4E04',
    },
    {
      'name': 'Neha',
      'last': 'Haha bilkul! 😂',
      'time': '15m',
      'unread': 3,
      'online': false,
      'url': 'https://lh3.googleusercontent.com/aida-public/AB6AXuDwUlzZTpEppXDkzGQXTpVsFTIPI-l6L8fBPZbDaXzjVer9-iKxt5aXElMcdxw1KNyU1d3aKUaJ8L0xYVBqdhVgzIZtdUQr6axSah9SlPjCLSZBq9bxEDL5gwFEyNQf9qC-JfSkEOagHbygY7YGqpofmAE2w2FdT_uAeBaUBuYWzeQn9Qs81Jz4RsbUuwz1iqhb5cajpe9GIseqkZ0ZZfp3SnAsnHt2x2k8J3E2Er5-AB-jCZQcuwz1JRPMBd4wTPfRMzLyHnI0ui4',
    },
    {
      'name': 'Yash',
      'last': 'Aaj canteen mein milte hai',
      'time': '1h',
      'unread': 0,
      'online': true,
      'url': 'https://lh3.googleusercontent.com/aida-public/AB6AXuBNtt_wYgFTJxKDSxoIDe7i6JqU92xxzbjtCGgwtezQZBRakLxLj0PU8b5U9rZcYjB77rhNTOKvgdYVrrcROwDCIb2adTFXXxquIyYKAkIDub7mACH911QYYB6oJhw8yCYE10fFqB89m1dtd0youkatWJrSUmTbcUqj0ssaTSPeUjNy_kbVh-Bn74eVnc1bbUuo7d3yWLzzmE4i_lP10qvxqbQETzg6rpb9llMYYf29taPrR7zMZYJtp-IPQpMSdLcCtKLs0gMHkgw',
    },
    {
      'name': 'Jatin',
      'last': 'Bhai kab aayega? 😅',
      'time': 'Yesterday',
      'unread': 1,
      'online': false,
      'url': 'https://lh3.googleusercontent.com/aida-public/AB6AXuCvzpxNzlkNMl4OMTuvqM1f2kxHuWXIhkKNvq_2PhHmotMpL880kJZ69JJZ0d6bsLaMpnoi-LJyBvQ_PI79pO3RDrSPUvCUSsm2-snro_qApZhPPkPUUmfceFh08bLGVVPUXS_k1VY9R-PDH82h6RByM6zMaGTrJHQ_zyicnrtXBk4exltnf4jmRW20cvNs6TV-nLfy_XdmP9YPfnrE_xyfX93uES6-QQ9shV7bJJsvrzZlVU2It1HPapHXLf4eLbisZzq__YGFrss',
    },
    {
      'name': 'David',
      'last': 'Good work today!',
      'time': 'Yesterday',
      'unread': 0,
      'online': false,
      'url': 'https://lh3.googleusercontent.com/aida-public/AB6AXuAfuha8VGG0BPiBwuldEhiK9YAE0ZJIm3M8NQLRRMrpBGwNbyf7YYtzio6JXwwEC5SKcqFfjg7Aczu0Poy_GmrU4zm7YgZvO4m5vURKmgOtHqYqRKmWvzeO3ElnB_-erPhAy00ddbmEwdiv5Wz66YfB5PvjgK2S390u-8j9MFyWGS6n40kKzw2vCeDkDM6DY_9seyet1uzDAIXG9o12iUI5XSMn7uQ9EAvzJhX9pW6kwZCekMVnS5zMLADilTBQL7Nu3l_cUOtl9bY',
    },
  ];

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
              child: CustomScrollView(
                slivers: [
                  SliverAppBar(
                    pinned: true,
                    automaticallyImplyLeading: false,
                    backgroundColor: isDark ? AppColors.backgroundDark : AppColors.backgroundLight,
                    title: Text('Messages', style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 20)),
                    actions: [
                      IconButton(icon: const Icon(Icons.search_rounded), onPressed: () => Navigator.pushNamed(context, '/search')),
                      IconButton(icon: const Icon(Icons.edit_rounded), onPressed: () {}),
                    ],
                  ),
                  SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (ctx, i) {
                        final c = _conversations[i];
                        return ListTile(
                          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                          leading: Stack(
                            children: [
                              ClipOval(
                                child: CachedNetworkImage(
                                  imageUrl: c['url'] as String,
                                  width: 52,
                                  height: 52,
                                  fit: BoxFit.cover,
                                ),
                              ),
                              if (c['online'] as bool)
                                Positioned(
                                  bottom: 0,
                                  right: 0,
                                  child: Container(
                                    width: 14,
                                    height: 14,
                                    decoration: BoxDecoration(
                                      color: Colors.green,
                                      shape: BoxShape.circle,
                                      border: Border.all(color: Colors.white, width: 2),
                                    ),
                                  ),
                                ),
                            ],
                          ),
                          title: Text(c['name'] as String, style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 14)),
                          subtitle: Text(
                            c['last'] as String,
                            style: GoogleFonts.inter(fontSize: 12, color: AppColors.textSecondaryLight),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          trailing: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(c['time'] as String, style: GoogleFonts.inter(fontSize: 11, color: AppColors.textSecondaryLight)),
                              if ((c['unread'] as int) > 0) ...[
                                const SizedBox(height: 4),
                                Container(
                                  width: 20,
                                  height: 20,
                                  decoration: const BoxDecoration(
                                    color: AppColors.primary,
                                    shape: BoxShape.circle,
                                  ),
                                  child: Center(
                                    child: Text(
                                      '${c['unread']}',
                                      style: GoogleFonts.inter(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w700),
                                    ),
                                  ),
                                ),
                              ],
                            ],
                          ),
                          onTap: () => Navigator.pushNamed(
                            context,
                            '/chat',
                            arguments: {
                              'name': c['name'],
                              'url': c['url'],
                              'online': c['online'],
                            },
                          ),
                        );
                      },
                      childCount: _conversations.length,
                    ),
                  ),
                ],
              ),
            ),
            BottomNavBar(currentIndex: 2),
          ],
        ),
      ),
    );
  }
}
