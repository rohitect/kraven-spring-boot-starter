import { Routes } from '@angular/router';

export const DOCUMENTATION_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./documentation.component').then(m => m.DocumentationComponent),
    children: [
      {
        path: '',
        redirectTo: 'getting-started',
        pathMatch: 'full'
      },
      {
        path: 'getting-started',
        loadComponent: () => import('./getting-started/getting-started.component').then(m => m.GettingStartedComponent)
      },
      {
        path: 'features',
        loadComponent: () => import('./features/features.component').then(m => m.FeaturesComponent)
      },
      {
        path: 'configuration',
        loadComponent: () => import('./configuration/configuration.component').then(m => m.ConfigurationComponent)
      },
      {
        path: 'plugins',
        loadComponent: () => import('./plugins/plugins.component').then(m => m.PluginsComponent)
      }
    ]
  }
];
