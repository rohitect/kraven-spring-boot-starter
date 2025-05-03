import { Routes } from '@angular/router';
import { ApiDocsComponent } from './components/api-docs/api-docs.component';
import { LandingPageComponent } from './components/landing-page/landing-page.component';
import { FeignClientExplorerComponent } from './components/feign-client-explorer/feign-client-explorer.component';
import { KafkaExplorerComponent } from './components/kafka-explorer/kafka-explorer.component';
import { OverviewComponent } from './components/overview/overview.component';
import { LayoutComponent } from './components/layout/layout.component';
import { DocumentationComponent } from './components/documentation/documentation.component';
import { MermaidTestComponent } from './components/mermaid-test/mermaid-test.component';
import { inject } from '@angular/core';
import { PluginService } from './services/plugin.service';
import { Router } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', component: LandingPageComponent },
      { path: 'overview', component: OverviewComponent },
      { path: 'api-docs', component: ApiDocsComponent },
      { path: 'api-docs/tab/:tab', component: ApiDocsComponent },
      { path: 'api-docs/:tag/:path/:method', component: ApiDocsComponent },
      { path: 'api-docs/info', component: ApiDocsComponent },
      { path: 'feign-clients', component: FeignClientExplorerComponent },
      { path: 'feign-clients/:client', component: FeignClientExplorerComponent },
      {
        path: 'kafka',
        component: KafkaExplorerComponent,
        canActivate: [
          () => {
            const pluginService = inject(PluginService);
            const router = inject(Router);

            // First check if Kafka plugin is registered
            const isKafkaPluginRegistered = pluginService.isPluginRegistered('kafka');

            if (!isKafkaPluginRegistered) {
              console.warn('Kafka plugin is not registered. Redirecting to home page.');
              router.navigate(['/']);
              return false;
            }

            // Then check if it's running
            const isKafkaPluginRunning = pluginService.isPluginRunning('kafka');

            if (!isKafkaPluginRunning) {
              console.warn('Kafka plugin is registered but not running. Redirecting to home page.');
              router.navigate(['/']);
              return false;
            }

            return true;
          }
        ]
      },
      { path: 'documentation', component: DocumentationComponent },
      { path: 'documentation/:groupId', component: DocumentationComponent },
      { path: 'documentation/:groupId/:fileId', component: DocumentationComponent },
      { path: 'mermaid-test', component: MermaidTestComponent }
    ]
  },
  {
    path: 'settings',
    loadComponent: () => import('./components/settings/settings.component').then(m => m.SettingsComponent),
    children: [
      {
        path: '',
        redirectTo: 'plugins',
        pathMatch: 'full'
      },
      {
        path: 'plugins',
        loadComponent: () => import('./components/settings/plugins/plugins.component').then(m => m.PluginsComponent)
      }
    ]
  },
  { path: '**', redirectTo: '' }
];
