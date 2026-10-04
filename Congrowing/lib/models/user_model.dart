class UserModel {
  final String id;
  final String name;
  final String username;
  final String email;
  final String? avatarUrl;
  final String? bio;
  final String? college;
  final int criScore;
  final int postsCount;
  final int friendsCount;
  final int followersCount;
  final bool isOnline;
  final DateTime createdAt;

  const UserModel({
    required this.id,
    required this.name,
    required this.username,
    required this.email,
    this.avatarUrl,
    this.bio,
    this.college,
    this.criScore = 0,
    this.postsCount = 0,
    this.friendsCount = 0,
    this.followersCount = 0,
    this.isOnline = false,
    required this.createdAt,
  });

  UserModel copyWith({
    String? id,
    String? name,
    String? username,
    String? email,
    String? avatarUrl,
    String? bio,
    String? college,
    int? criScore,
    int? postsCount,
    int? friendsCount,
    int? followersCount,
    bool? isOnline,
    DateTime? createdAt,
  }) {
    return UserModel(
      id: id ?? this.id,
      name: name ?? this.name,
      username: username ?? this.username,
      email: email ?? this.email,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      bio: bio ?? this.bio,
      college: college ?? this.college,
      criScore: criScore ?? this.criScore,
      postsCount: postsCount ?? this.postsCount,
      friendsCount: friendsCount ?? this.friendsCount,
      followersCount: followersCount ?? this.followersCount,
      isOnline: isOnline ?? this.isOnline,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'username': username,
      'email': email,
      'avatarUrl': avatarUrl,
      'bio': bio,
      'college': college,
      'criScore': criScore,
      'postsCount': postsCount,
      'friendsCount': friendsCount,
      'followersCount': followersCount,
      'isOnline': isOnline,
      'createdAt': createdAt.toIso8601String(),
    };
  }

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] as String,
      name: json['name'] as String,
      username: json['username'] as String,
      email: json['email'] as String,
      avatarUrl: json['avatarUrl'] as String?,
      bio: json['bio'] as String?,
      college: json['college'] as String?,
      criScore: json['criScore'] as int? ?? 0,
      postsCount: json['postsCount'] as int? ?? 0,
      friendsCount: json['friendsCount'] as int? ?? 0,
      followersCount: json['followersCount'] as int? ?? 0,
      isOnline: json['isOnline'] as bool? ?? false,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}
