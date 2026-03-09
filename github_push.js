const https = require('https');
const { execSync } = require('child_process');

const CLIENT_ID = '178c6fc778ccc68e1d6a'; // GitHub CLI client ID

async function fetchJson(url, options) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, options, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve(data);
                }
            });
        });
        req.on('error', reject);
        if (options.body) req.write(options.body);
        req.end();
    });
}

async function run() {
    console.log('Requesting device code...');
    const deviceResp = await fetchJson('https://github.com/login/device/code', {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: CLIENT_ID, scope: 'repo workflow' })
    });

    if (deviceResp.user_code) {
        console.log('');
        console.log('=== GITHUB_AUTH_REQUIRED ===');
        console.log(`URL: ${deviceResp.verification_uri}`);
        console.log(`CODE: ${deviceResp.user_code}`);
        console.log('============================');
        console.log('');

        let token = null;
        while (!token) {
            await new Promise(r => setTimeout(r, (deviceResp.interval || 5) * 1000));
            const tokenResp = await fetchJson('https://github.com/login/oauth/access_token', {
                method: 'POST',
                headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    client_id: CLIENT_ID,
                    device_code: deviceResp.device_code,
                    grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
                })
            });

            if (tokenResp.access_token) {
                token = tokenResp.access_token;
            } else if (tokenResp.error === 'authorization_pending' || tokenResp.error === 'slow_down') {
                process.stdout.write('.');
            } else {
                console.error('\nError:', tokenResp);
                return;
            }
        }

        console.log('\nAuthorization successful!');

        const repoName = 'youtube-data-dashboard';
        console.log(`Creating repository ${repoName}...`);

        const createResp = await fetchJson('https://api.github.com/user/repos', {
            method: 'POST',
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'NodeScript',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: repoName,
                private: false,
                description: 'YouTube trending data dashboard built with Node.js and Express'
            })
        });

        if (createResp.clone_url) {
            console.log(`Repository created: ${createResp.html_url}`);
            try {
                // If remote origin exists, remove it first to be safe
                try { execSync('git remote remove origin', { stdio: 'ignore' }); } catch (e) { }
                const remoteUrl = `https://oauth2:${token}@github.com/${createResp.full_name}.git`;
                console.log('Adding remote and pushing code...');
                execSync('git branch -M main', { stdio: 'inherit' });
                execSync(`git remote add origin ${remoteUrl}`, { stdio: 'inherit' });
                execSync('git push -u origin main', { stdio: 'inherit' });
                console.log('\n✅ Push completed successfully: ' + createResp.html_url);
                console.log('SUCCESS_URL:' + createResp.html_url);
            } catch (err) {
                console.error('\nFailed to push code:', err.message);
            }
        } else if (createResp.message && createResp.message.includes('name already exists')) {
            console.log(`Repository ${repoName} already exists. Fetching info to push...`);
            const userResp = await fetchJson('https://api.github.com/user', {
                method: 'GET',
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'NodeScript'
                }
            });
            const remoteUrl = `https://oauth2:${token}@github.com/${userResp.login}/${repoName}.git`;
            try {
                try { execSync('git remote remove origin', { stdio: 'ignore' }); } catch (e) { }
                execSync('git branch -M main', { stdio: 'inherit' });
                execSync(`git remote add origin ${remoteUrl}`, { stdio: 'inherit' });
                execSync('git push -u origin main', { stdio: 'inherit' });
                console.log('\n✅ Push completed successfully: ' + `https://github.com/${userResp.login}/${repoName}`);
                console.log('SUCCESS_URL:' + `https://github.com/${userResp.login}/${repoName}`);
            } catch (err) {
                console.error('\nFailed to push code:', err.message);
            }
        } else {
            console.error('\nFailed to create repo:', createResp);
        }
    } else {
        console.error('Failed to get device code:', deviceResp);
    }
}

run();
