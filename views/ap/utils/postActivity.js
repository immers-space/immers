export const JSONLDMime = 'application/activity+json'
// const PublicAddress = 'as:Public'

export function postActivity (activity, actor, token) {
  return window.fetch(actor.outbox, {
    method: 'POST',
    headers: {
      'Content-Type': JSONLDMime,
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(activity)
  })
}

export function accept (followId, recipient, actor, token) {
  return postActivity({
    type: 'Accept',
    actor: actor.id,
    object: followId,
    to: recipient.id
  }, actor, token)
}

export function reject (objectId, recipient, actor, token) {
  return postActivity({
    type: 'Reject',
    actor: actor.id,
    object: objectId,
    to: recipient.id
  }, actor, token)
}
