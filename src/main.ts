import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { debug } from 'debug';

import { AppModule } from './app/app.module';
import { displayError } from './app/util/error';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .catch((err) => console.log(err));

window['Capacitor'].handleError = displayError;
