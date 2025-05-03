import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { SettingsRoutingModule } from './settings-routing.module';
import { SettingsComponent } from './settings.component';
import { SettingsSidebarComponent } from './settings-sidebar/settings-sidebar.component';
import { PluginsComponent } from './plugins/plugins.component';
import { HeaderComponent } from '../shared/header/header.component';

@NgModule({
  declarations: [
    SettingsComponent,
    SettingsSidebarComponent,
    PluginsComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    SettingsRoutingModule,
    HeaderComponent
  ]
})
export class SettingsModule { }
