import fs from 'node:fs'
import process from 'node:process'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

function readArg(name) {
  const prefix = `${name}=`
  const match = process.argv.find((arg) => arg.startsWith(prefix))
  return match ? match.slice(prefix.length) : ''
}

function fail(message) {
  console.error(message)
  process.exit(1)
}

const serviceAccountPath = readArg('--service-account')
const phoneNumber = readArg('--phone')
const uid = readArg('--uid')
const role = readArg('--role') || 'authenticated'

if (!serviceAccountPath) {
  fail(
    'Missing --service-account=<path-to-json>. Example: npm run firebase:set-role -- --service-account="C:\\path\\service-account.json" --phone="+9779822403262"',
  )
}

if (!phoneNumber && !uid) {
  fail('Provide either --phone=<e164-phone> or --uid=<firebase-uid>.')
}

if (!fs.existsSync(serviceAccountPath)) {
  fail(`Service account file not found: ${serviceAccountPath}`)
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'))

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  })
}

const auth = getAuth()

async function resolveUid() {
  if (uid) {
    return uid
  }

  const userRecord = await auth.getUserByPhoneNumber(phoneNumber)
  return userRecord.uid
}

async function main() {
  const resolvedUid = await resolveUid()
  const userRecord = await auth.getUser(resolvedUid)
  const nextClaims = {
    ...(userRecord.customClaims || {}),
    role,
  }

  await auth.setCustomUserClaims(resolvedUid, nextClaims)

  console.log(`Set custom claims for uid ${resolvedUid}`)
  console.log(JSON.stringify(nextClaims, null, 2))
  console.log('Sign out in the app and verify the OTP again so Firebase issues a fresh ID token.')
}

main().catch((error) => {
  console.error(error.message || error)
  process.exit(1)
})
