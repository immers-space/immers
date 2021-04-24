// actual permissions scopes
module.exports.scopes = {
  // level 0 scopes don't grant any more access than unauthorized requests on public routes
  viewProfile: { level: 0, description: ['Use your name and avatar'], name: 'viewProfile' },
  viewPublic: { level: 0, description: ['View public posts in Immers Chat'], name: 'viewPublic' },

  viewFriends: { level: 1, description: ['View your friends list'], name: 'viewFriends' },
  postLocation: { level: 1, description: ['Share your presence here with friends'], name: 'postLocation' },

  viewPrivate: { level: 2, description: ['View private posts in Immers chat'], name: 'viewPrivate' },
  creative: {
    level: 2,
    description: [
      'Save changes to your name and avatar',
      'Make posts in Immers chat and share selfies',
      'Save new avatars and inventory items'
    ],
    name: 'creative'
  },
  addFriends: { level: 2, description: ['Send and accept friend requests'], name: 'addFriends' },
  addBlocks: { level: 2, description: ['Add to your blocklist'], name: 'addBlocks' },

  destructive: {
    level: 3,
    description: [
      'Remove existing friends and blocks',
      'Delete Immers chats, avatars, and inventory items'
    ],
    name: 'destructive'
  }
}

// common bundles of scopes
module.exports.roles = [
  { label: 'Just identity', name: 'public', level: 0 },
  { label: 'Share location', name: 'friends', level: 1 },
  { label: 'Social features', name: 'modAdditive', level: 2 },
  { label: 'Account maintenance', name: 'modFull', level: 3 }
]
