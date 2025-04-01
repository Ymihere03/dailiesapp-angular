import express from 'express'
import { exchangeDropboxCodeAction, completeTokenExchange } from './dropbox/auth-token-requests';
export const router = express.Router()

router.route('/webhook')
    // Handle the dropbox challenge
    // This is only for endpoint verification and doesn't impact anything else
    .get((req, res) => {
    const url = new URL(req.url);
    const challenge = url.searchParams.get('challenge');
    
    if (challenge) {
      res.set('Content-Type', 'text/plain').set('X-Content-Type-Options', 'nosniff')
      res.status(200).send(challenge);
      return;
    }
    
    res.send('');
  })
  .post((req, res) => {
    // Handle notify messages from dropbox
    // These occur after a user connects their dropbox account and updates their dropbox files
    const body = req.body();

    console.log("Dropbox update received!!", JSON.stringify(body, null, 2));
    
    res.status(200).send({status:'ok'})
  })

router.get('/oauth2', async (req, res) => {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  console.info("dropbox/oauth2 api");
  
  if (!code) {
    res.status(400).send('No code provided');
    return;
  }

  const token = await exchangeDropboxCodeAction({
    code: code,
    clientId: process.env['PUBLIC_DROPBOX_CLIENT_ID']!,
    clientSecret: process.env['DROPBOX_CLIENT_SECRET']!,
    redirectUri: `${process.env['PUBLIC_APP_URL']}/api/dropbox/oauth2`,
    state: state,
    grantCode: 'authorization_code'
  });

  // Handle the token (store it securely, etc.)
  // Redirect user to appropriate page
  if (token) {
    console.info("token received...storing...");
    completeTokenExchange(token);
    res.redirect('/');
    //return redirect("/protected");
    // return new Response('', {
    //   headers: { 'Content-Type': 'text/plain'},
    //   status: 200
    // })
  } else {
    res.status(400).send('Token Exchange Failed');
    //return new Response('token exchange failed', { status: 400 });
  }
});