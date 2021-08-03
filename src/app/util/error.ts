import { AlertOptions } from '@ionic/angular';

export const displayError = async <E extends Error>(error: E) => {
  const alert = document.createElement('ion-alert');

  const options: AlertOptions = {
    header: 'Oh no! 😓',
    subHeader: 'An error occoured',
    message: error.message,
    cssClass: 'alert-kind-error',
    backdropDismiss: false,
    // eslint-disable-next-line @typescript-eslint/quotes
    buttons: ["Fuck it'"],
  };

  Object.assign(alert, options);

  document.body.appendChild(alert);
  await alert.present();
};
