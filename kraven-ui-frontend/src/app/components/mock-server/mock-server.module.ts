import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';

import { MockServerDashboardComponent } from './dashboard/mock-server-dashboard.component';
import { EndpointManagementComponent } from './endpoint-management/endpoint-management.component';
import { ConfigurationManagementComponent } from './configuration-management/configuration-management.component';
import { PluginLoaderComponent } from '../shared/plugin-loader/plugin-loader.component';
import { PluginRouteGuard } from '../../guards/plugin-route.guard';
import { AndypfJsonViewerComponent } from '../andypf-json-viewer/andypf-json-viewer.component';

const routes: Routes = [
  {
    path: '',
    component: MockServerDashboardComponent,
    canActivate: [PluginRouteGuard],
    data: { pluginId: 'mock-server' }
  }
];

@NgModule({
  declarations: [
    MockServerDashboardComponent,
    EndpointManagementComponent,
    ConfigurationManagementComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    RouterModule.forChild(routes),
    PluginLoaderComponent,
    AndypfJsonViewerComponent
  ],
  exports: [
    RouterModule
  ]
})
export class MockServerModule { }
