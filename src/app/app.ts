import { Component } from '@angular/core';
import { CurvedCarouselComponent } from './curved-carousel/curved-carousel.component';
import { Carrousel } from './carrousel/carrousel';

@Component({
  selector: 'app-root',
  imports: [CurvedCarouselComponent,Carrousel],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  title = 'curved-carousels-v2';
}
