import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ActuatorTabContainerComponent } from './tab-container/actuator-tab-container.component';
import { HealthTabComponent } from './health-tab/health-tab.component';
import { MetricsTabComponent } from './metrics-tab/metrics-tab.component';
import { EnvironmentTabComponent } from './environment-tab/environment-tab.component';
import { BeansTabComponent } from './beans-tab/beans-tab.component';
import { ThreadsTabComponent } from './threads-tab/threads-tab.component';
import { MemoryTabComponent } from './memory-tab/memory-tab.component';
import { PluginRouteGuard } from '../../guards/plugin-route.guard';

const routes: Routes = [
  {
    path: '',
    component: ActuatorTabContainerComponent,
    canActivate: [PluginRouteGuard],
    data: { pluginId: 'actuator-insights' },
    children: [
      { path: '', redirectTo: 'health', pathMatch: 'full' },
      { path: 'health', component: HealthTabComponent },
      { path: 'metrics', component: MetricsTabComponent },
      { path: 'environment', component: EnvironmentTabComponent },
      { path: 'beans', component: BeansTabComponent },
      { path: 'threads', component: ThreadsTabComponent },
      { path: 'memory', component: MemoryTabComponent }
    ]
  }
];

@NgModule({
  imports: [
    RouterModule.forChild(routes),
    ActuatorTabContainerComponent,
    HealthTabComponent,
    MetricsTabComponent,
    EnvironmentTabComponent,
    BeansTabComponent,
    ThreadsTabComponent,
    MemoryTabComponent
  ],
  exports: [
    RouterModule
  ]
})
export class ActuatorInsightsModule { }
