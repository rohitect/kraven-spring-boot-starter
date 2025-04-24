import { Routes } from '@angular/router';
import { ApiDocsComponent } from './components/api-docs/api-docs.component';
import { LandingPageComponent } from './components/landing-page/landing-page.component';
import { FeignClientExplorerComponent } from './components/feign-client-explorer/feign-client-explorer.component';
import { KafkaExplorerComponent } from './components/kafka-explorer/kafka-explorer.component';
import { OverviewComponent } from './components/overview/overview.component';
import { LayoutComponent } from './components/layout/layout.component';

export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', component: LandingPageComponent },
      { path: 'overview', component: OverviewComponent },
      { path: 'api-docs', component: ApiDocsComponent },
      { path: 'api-docs/:tag/:path/:method', component: ApiDocsComponent },
      { path: 'api-docs/info', component: ApiDocsComponent },
      { path: 'feign-clients', component: FeignClientExplorerComponent },
      { path: 'feign-clients/:client', component: FeignClientExplorerComponent },
      { path: 'kafka', component: KafkaExplorerComponent }
    ]
  },
  { path: '**', redirectTo: '' }
];
