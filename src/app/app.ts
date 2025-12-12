import { Component } from '@angular/core';
import { CurvedCarouselComponent } from './curved-carousel/curved-carousel.component';

@Component({
  selector: 'app-root',
  imports: [CurvedCarouselComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  title = 'curved-carousels-v2';
}
