import 'dotenv/config'

const apiKey = process.env.LINEAR_API_KEY
const teamKey = process.env.LINEAR_TEAM_ID || 'NIO'

async function run() {
  console.log('Testing Linear API Integration...')
  console.log('Team Key:', teamKey)
  console.log('API Key Provided:', apiKey ? 'YES' : 'NO')

  if (!apiKey) {
    console.log('No LINEAR_API_KEY found in process.env. Skipping network test.')
    return
  }

  const query = `
    query GetLinearIssues($teamKey: String!) {
      viewer {
        id
        name
        email
      }
      teams(filter: { key: { eqIgnoreCase: $teamKey } }) {
        nodes {
          id
          key
          name
          issues(first: 10) {
            nodes {
              id
              identifier
              title
              state {
                name
              }
            }
          }
        }
      }
    }
  `

  try {
    const res = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiKey
      },
      body: JSON.stringify({ query, variables: { teamKey } })
    })

    console.log('HTTP Status:', res.status)
    const data = await res.json()
    console.log('Response Data:', JSON.stringify(data, null, 2))
  } catch (err) {
    console.error('Error querying Linear API:', err)
  }
}

run()
