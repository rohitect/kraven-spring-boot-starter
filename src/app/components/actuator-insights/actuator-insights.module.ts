import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { ActuatorDashboardComponent } from './dashboard/actuator-dashboard.component';
import { HealthMonitorComponent } from './health-monitor/health-monitor.component';
import { MetricsViewerComponent } from './metrics-viewer/metrics-viewer.component';
import { PluginLoaderComponent } from '../shared/plugin-loader/plugin-loader.component';
import { PluginRouteGuard } from '../../guards/plugin-route.guard';

const routes: Routes = [
  {
    path: '',
    component: ActuatorDashboardComponent,
    canActivate: [PluginRouteGuard],
    data: { pluginId: 'actuator-insights' }
  }
];

@NgModule({
  declarations: [
    ActuatorDashboardComponent,
    HealthMonitorComponent,
    MetricsViewerComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    RouterModule.forChild(routes)
  ],
  exports: [
    RouterModule
  ]
})
export class ActuatorInsightsModule { }
