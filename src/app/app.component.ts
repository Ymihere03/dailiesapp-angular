import { Component, inject, PLATFORM_ID } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DOCUMENT, isPlatformBrowser, isPlatformServer } from "@angular/common";
import { initiateDropboxAuthAction } from '../../api/dropbox/auth-token-requests';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'dailiesapp-angular';
  private readonly platform = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);

  constructor(private router: Router) {
      if (isPlatformBrowser(this.platform)) {
          console.warn("browser");
          // Safe to use document, window, localStorage, etc. :-)
          //console.log(document);
      }

      if (isPlatformServer(this.platform)) {
          console.warn("server");
          // Not smart to use document here, however, we can inject it ;-)
          //console.log(this.document);
      }
  }

  async initiateOAuth2() {
    console.log("button clicked");
    const redirectURL = await initiateDropboxAuthAction({
      clientId: '0v2jbrmtxedf84h',
      redirectUri: `https://dailiesapp-angular-git-develop-benbdarling-gmailcoms-projects.vercel.app/dropbox/oauth2`,
      state: null
    });
    console.log('redirected to ', redirectURL);
    window.location.href = redirectURL;
    //this.router.navigateByUrl(redirectURL);
    // initiateDropboxAuthAction({
    //   clientId: process.env['PUBLIC_DROPBOX_CLIENT_ID']!,
    //   redirectUri: `${process.env['PUBLIC_APP_URL']}/api/dropbox-oauth2`,
    //   state: null
    // });
  }
}
