import { Component, computed, NgZone, signal } from '@angular/core';
import { CommonModule } from '@angular/common'; 
@Component({
  selector: 'app-carrousel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './carrousel.html',
  styles: [`
    .scene {
    perspective: 1000px;
    overflow: hidden;
  }
  
  /* Animation des pupilles qui suivent le défilement */
  @keyframes scan {
    0%, 100% { transform: translateX(-5px); } /* Regarde à gauche */
    50% { transform: translateX(5px); }      /* Regarde à droite */
  }

  /* Animation de clignement des yeux (Blink) */
  @keyframes blink {
    0%, 48%, 52%, 100% { transform: scaleY(1); }
    50% { transform: scaleY(0.1); }
  }

  .eye-pupil {
    animation: scan 2s ease-in-out infinite;
  }
  
  .robot-eyes {
    animation: blink 4s infinite;
  }

  .scene:hover .eye-pupil {
  transform: scale(1.5);
  background-color: #f87171; /* Devient rouge par exemple */
  box-shadow: 0 0 15px #f87171;
  transition: all 0.3s;
}
  `]
})
export class Carrousel {
 
  images = [
    'https://picsum.photos/300/400?random=1',
    'https://picsum.photos/300/400?random=2',
    'https://picsum.photos/300/400?random=3',
    'https://picsum.photos/300/400?random=4',
    'https://picsum.photos/300/400?random=5',
    'https://picsum.photos/300/400?random=6',
    // Il est important d'avoir assez d'images pour remplir l'écran
    // Si vous avez un trou noir, dupliquez votre liste ici
    'https://picsum.photos/300/400?random=1', 
    'https://picsum.photos/300/400?random=2',
  ];

  // CONFIGURATION
  cardWidth = 250; 
  gap = 20;
  spacing = this.cardWidth + this.gap; // Espace total occupé par une carte
  
  scrollOffset = signal(0);
  animationId: number | null = null;

  constructor(private ngZone: NgZone) {}

  ngAfterViewInit() {
    this.ngZone.runOutsideAngular(() => this.animate());
  }

  ngOnDestroy() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
  }

  animate() {
    // Vitesse de défilement (pixels par frame)
    this.scrollOffset.update(v => v + 1.5); 
    this.animationId = requestAnimationFrame(() => this.animate());
  }

  getCardStyle(index: number) {
    const totalLen = this.images.length * this.spacing;
    
    // 1. CALCUL DE LA POSITION (Logique Tapis Roulant)
    
    // Position naturelle qui avance indéfiniment
    let pos = (index * this.spacing) - this.scrollOffset();
    
    // Le Modulo (%) permet de créer la boucle
    // Mais le modulo JS peut renvoyer des négatifs bizarres, 
    // donc on ajoute une logique de "Wrap Around" manuelle robuste :
    
    // Tant que l'image est trop loin à gauche (sortie de l'écran), on la renvoie au fond à droite
    while (pos < -500) { 
      pos += totalLen;
    }
    // (Optionnel) Sécurité si on scrollait dans l'autre sens
    while (pos > totalLen - 500) {
      pos -= totalLen;
    }

    // 2. CALCUL DE LA COURBE (Esthétique uniquement)
    
    // On détermine où est l'image par rapport au centre de l'écran (0)
    // 0 = centre, -300 = gauche, +300 = droite
    const centerDist = pos; 
    
    // Plus on s'éloigne du centre, plus on recule (Z) et on tourne (RotateY)
    // On divise par 500 pour adoucir l'effet
    const distFactor = centerDist / 500; 

    // Profondeur : Formule parabolique (courbe douce)
    // Math.abs assure que gauche et droite reculent pareil
    const translateZ = -100 * Math.pow(Math.abs(distFactor), 2);
    
    // Rotation : L'image pivote pour regarder le centre
    // On limite la rotation à 45 degrés max pour ne pas qu'elles se retournent
    let rotateY = distFactor * -30; // -30 degrés max
    
    // Opacité : On efface doucement sur les bords pour éviter le "pop" visuel
    let opacity = 1 - Math.pow(Math.abs(distFactor), 4);
    if (opacity < 0) opacity = 0;

    return {
      transform: `translateX(${pos}px) translateZ(${translateZ}px) rotateY(${rotateY}deg)`,
      opacity: opacity,
      zIndex: 100 - Math.round(Math.abs(distFactor) * 100) // Le centre est toujours au-dessus
    };
  }
}