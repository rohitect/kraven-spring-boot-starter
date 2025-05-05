import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { TestComponent } from './pages/test/test.component';
import { DocumentationComponent } from './pages/documentation/documentation.component';
import { GettingStartedComponent } from './pages/documentation/getting-started/getting-started.component';
import { FeaturesComponent } from './pages/documentation/features/features.component';
import { ConfigurationComponent } from './pages/documentation/configuration/configuration.component';
import { PluginsComponent } from './pages/documentation/plugins/plugins.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'test', component: TestComponent },
  {
    path: 'documentation',
    component: DocumentationComponent,
    children: [
      { path: '', redirectTo: 'getting-started', pathMatch: 'full' },
      { path: 'getting-started', component: GettingStartedComponent },
      { path: 'features', component: FeaturesComponent },
      { path: 'configuration', component: ConfigurationComponent },
      { path: 'plugins', component: PluginsComponent }
    ]
  },
  { path: '**', redirectTo: '' }
];
