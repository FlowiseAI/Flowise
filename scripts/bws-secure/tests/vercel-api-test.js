/* eslint-disable no-console */
/**
 * Vercel API Test Script
 *
 * This script tests various Vercel API endpoints to help diagnose issues
 * with project detection and team access.
 */

import axios from 'axios';
import fs from 'node:fs';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Load environment variables from .env file
dotenv.config();

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to format JSON output
function formatJSON(data) {
  return JSON.stringify(data, null, 2);
}

// Get Vercel token from environment
function getVercelToken() {
  // First try VERCEL_AUTH_TOKEN (new)
  const authToken = process.env.VERCEL_AUTH_TOKEN;
  if (authToken) {
    console.log('Using VERCEL_AUTH_TOKEN from environment');
    return authToken.startsWith('Bearer ') ? authToken : `Bearer ${authToken}`;
  }

  // Then try VERCEL_TOKEN (legacy)
  const envToken = process.env.VERCEL_TOKEN;
  if (envToken) {
    console.log('Using VERCEL_TOKEN from environment');
    return envToken.startsWith('Bearer ') ? envToken : `Bearer ${envToken}`;
  }

  throw new Error(
    'No Vercel token found. Please set VERCEL_AUTH_TOKEN or VERCEL_TOKEN env variable.'
  );
}

// Test Vercel API endpoints
async function testVercelAPI() {
  const vercelToken = getVercelToken();
  console.log('Vercel API Test');
  console.log('==============');

  try {
    // 1. Test getting user info
    console.log('\n1. Testing User Info API:');
    try {
      const userResp = await axios.get('https://api.vercel.com/v2/user', {
        headers: { Authorization: vercelToken }
      });
      console.log('✅ User API success');
      console.log(`User: ${userResp.data.user.name} (${userResp.data.user.email})`);
      console.log(`User ID: ${userResp.data.user.id}`);
    } catch (error) {
      console.log('❌ User API failed:', error.message);
      if (error.response?.data) {
        console.log('Response:', formatJSON(error.response.data));
      }
    }

    // 2. Test getting teams
    console.log('\n2. Testing Teams API:');
    let teams = [];
    try {
      const teamsResp = await axios.get('https://api.vercel.com/v2/teams', {
        headers: { Authorization: vercelToken }
      });
      teams = teamsResp.data.teams || [];
      console.log('✅ Teams API success');
      console.log(`Found ${teams.length} teams:`);
      teams.forEach((team) => {
        console.log(`- ${team.name} (Slug: ${team.slug}, ID: ${team.id})`);
      });
    } catch (error) {
      console.log('❌ Teams API failed:', error.message);
      if (error.response?.data) {
        console.log('Response:', formatJSON(error.response.data));
      }
    }

    // 3. Test getting personal projects
    console.log('\n3. Testing Personal Projects API:');
    let personalProjects = [];
    try {
      const projectsResp = await axios.get('https://api.vercel.com/v9/projects', {
        headers: { Authorization: vercelToken }
      });
      personalProjects = projectsResp.data.projects || [];
      console.log('✅ Personal Projects API success');
      console.log(`Found ${personalProjects.length} projects in personal account:`);
      personalProjects.forEach((project) => {
        console.log(`- ${project.name} (ID: ${project.id})`);
      });
    } catch (error) {
      console.log('❌ Personal Projects API failed:', error.message);
      if (error.response?.data) {
        console.log('Response:', formatJSON(error.response.data));
      }
    }

    // 4. Test getting team projects for each team
    console.log('\n4. Testing Team Projects API:');
    for (const team of teams) {
      console.log(`\nTeam: ${team.name} (${team.slug})`);
      try {
        const teamProjectsResp = await axios.get('https://api.vercel.com/v9/projects', {
          headers: { Authorization: vercelToken },
          params: { teamId: team.id }
        });
        const teamProjects = teamProjectsResp.data.projects || [];
        console.log(`✅ Found ${teamProjects.length} projects in team ${team.slug}:`);
        teamProjects.forEach((project) => {
          console.log(`- ${project.name} (ID: ${project.id})`);
        });
      } catch (error) {
        console.log(`❌ Team ${team.slug} Projects API failed:`, error.message);
        if (error.response?.data) {
          console.log('Response:', formatJSON(error.response.data));
        }
      }
    }

    // 5. Try to find a specific project if provided
    const projectName = process.argv[2];
    if (projectName) {
      console.log(`\n5. Searching for project "${projectName}" in all teams and personal account:`);
      let found = false;

      // Check personal projects
      const personalMatch = personalProjects.find((p) => p.name === projectName);
      if (personalMatch) {
        console.log(
          `✅ Project "${projectName}" found in personal account with ID: ${personalMatch.id}`
        );
        found = true;
      }

      // Check team projects
      for (const team of teams) {
        try {
          const teamProjectsResp = await axios.get('https://api.vercel.com/v9/projects', {
            headers: { Authorization: vercelToken },
            params: { teamId: team.id }
          });
          const teamProjects = teamProjectsResp.data.projects || [];
          const teamMatch = teamProjects.find((p) => p.name === projectName);

          if (teamMatch) {
            console.log(
              `✅ Project "${projectName}" found in team "${team.slug}" with ID: ${teamMatch.id}`
            );
            found = true;
          }
        } catch (error) {
          console.log(`❌ Could not search in team ${team.slug}:`, error.message);
        }
      }

      if (!found) {
        console.log(`❌ Project "${projectName}" not found in any team or personal account`);
      }
    }
  } catch (error) {
    console.error('Test failed with error:', error.message);
  }
}

// Run the tests
testVercelAPI().catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});
