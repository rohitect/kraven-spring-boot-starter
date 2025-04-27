import { ApplicationConfig, provideZoneChangeDetection, SecurityContext } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { MARKED_OPTIONS, provideMarkdown } from 'ngx-markdown';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withFetch()),
    provideMarkdown({
      markedOptions: {
        provide: MARKED_OPTIONS,
        useValue: {
          gfm: true,          // GitHub flavored markdown
          breaks: true,       // Convert \n to <br>
          pedantic: false    // Don't be too strict with original markdown spec

          // The breaks: true option will handle most of our needs for whitespace
        }
      },
      sanitize: SecurityContext.NONE  // Don't sanitize HTML to allow custom elements
    }),
  ]
};
