import 'dotenv/config'

const email = process.env.JIRA_EMAIL;
const token = process.env.JIRA_TOKEN;
const host = process.env.JIRA_HOST;
const projectKey = process.env.JIRA_PROJECT_KEY;

async function run() {
  const authString = Buffer.from(`${email}:${token}`).toString('base64');
  
  // 1. Test projects list
  try {
    const res = await fetch(`${host}/rest/api/3/project`, {
      headers: {
        'Authorization': `Basic ${authString}`,
        'Accept': 'application/json'
      }
    });
    console.log('Project list status:', res.status);
    const body = await res.text();
    console.log('Project list response:', body.substring(0, 500));
  } catch (err) {
    console.error('Project list error:', err);
  }

  // 2. Test search issues in project
  try {
    const jql = `project = "${projectKey}"`;
    const res = await fetch(`${host}/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&fields=summary,description`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Accept': 'application/json'
      }
    });
    console.log('Search status:', res.status);
    const body = await res.text();
    console.log('Search response:', body.substring(0, 1000));
  } catch (err) {
    console.error('Search error:', err);
  }
}

run();
