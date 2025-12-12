import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as THREE from 'three';
import gsap from 'gsap';

interface Slide {
  id: number;
  color: string;
  title: string;
}

@Component({
  selector: 'app-curved-carousel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './curved-carousel.component.html',
  styleUrls: ['./curved-carousel.component.scss']
})
export class CurvedCarouselComponent implements AfterViewInit, OnDestroy {
  @ViewChild('rendererCanvas') rendererCanvas!: ElementRef<HTMLCanvasElement>;

  activeSlide = signal(0);
  slides: Slide[] = [
    { id: 0, color: '#FF3366', title: 'Slide 1' },
    { id: 1, color: '#33CCFF', title: 'Slide 2' },
    { id: 2, color: '#66FF33', title: 'Slide 3' },
    { id: 3, color: '#FF9933', title: 'Slide 4' }
  ];

  slideIndicators = this.slides.map((slide, index) => ({ slideId: index }));

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private carouselGroup!: THREE.Group;
  private slideMeshes: THREE.Mesh[] = [];
  private resizeObserver!: ResizeObserver;
  private animationId!: number;
  private autoPlayInterval?: number;

  constructor() {
    // Effect to trigger rotation when activeSlide changes
    effect(() => {
      const index = this.activeSlide();
      this.rotateToSlide(index);
    });
  }

  ngAfterViewInit(): void {
    this.initThree();
    this.createSlides();
    this.animate();
    this.startAutoPlay();
    
    // Handle resize
    this.resizeObserver = new ResizeObserver(() => this.onResize());
    this.resizeObserver.observe(this.rendererCanvas.nativeElement.parentElement!);
  }

  ngOnDestroy(): void {
    this.stopAutoPlay();
    if (this.animationId) cancelAnimationFrame(this.animationId);
    if (this.resizeObserver) this.resizeObserver.disconnect();
    if (this.renderer) this.renderer.dispose();
  }

  private getCameraSettings(): { fov: number; zPosition: number } {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const isMobile = width < 768;
    const isTablet = width >= 768 && width < 1024;
    
    if (isMobile) {
      // Mobile : FOV plus large et caméra plus proche pour compenser la petite taille
      return { fov: 35, zPosition: 13 };
    } else if (isTablet) {
      // Tablette : valeurs intermédiaires
      return { fov: 32, zPosition: 14 };
    } else {
      // Desktop : valeurs par défaut
      return { fov: 30.5, zPosition: 15 };
    }
  }

  private initThree(): void {
    const canvas = this.rendererCanvas.nativeElement;
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    // Camera avec paramètres adaptatifs
    const cameraSettings = this.getCameraSettings();
    this.camera = new THREE.PerspectiveCamera(cameraSettings.fov, width / height, 0.5, 1000);
    this.camera.position.set(0, 0, cameraSettings.zPosition);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Group to hold all slides
    this.carouselGroup = new THREE.Group();
    this.scene.add(this.carouselGroup);
  }

  private createSlides(): void {
    // [MODIFICATION] Ajustez 'radius' pour la courbure.
    // Plus grand = moins incurvé (plus plat).
    // Plus petit = plus incurvé (plus cylindrique).
    const radius = 18; 
    const height = 15; // Hauteur suffisante pour couvrir l'écran
    const segments = this.slides.length;
    const anglePerSlide = (Math.PI * 2) / segments;

    this.slides.forEach((slide, index) => {
      const texture = this.createSlideTexture(slide, index);
      
      // Geometry
      const geometry = new THREE.CylinderGeometry(
        radius, radius, height, 
        32, 1, 
        true, 
        0, anglePerSlide
      );

      const material = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.BackSide,
        transparent: true
      });

      const mesh = new THREE.Mesh(geometry, material);
      
      // Fix Mirrored Text
      mesh.scale.x = -1;

      // Positioning
      const angleOffset = -Math.PI / 2;
      // [FIX] Inversion de la direction de placement (-index) pour correspondre à la rotation positive.
      // Cela corrige le problème où cliquer sur 2 affiche 4.
      mesh.rotation.y = -index * anglePerSlide + angleOffset - anglePerSlide / 2;
      
      // Stocker la référence au mesh avec son index
      mesh.userData['slideIndex'] = index;
      
      // Initialiser la visibilité : seul le premier slide est visible
      if (index !== 0) {
        material.opacity = 0;
        mesh.visible = false;
      }
      
      this.slideMeshes.push(mesh);
      
      this.carouselGroup.add(mesh);
    });
  }

  private darkenColor(color: string, factor: number): string {
    // Convertir hex en RGB
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    // Assombrir
    const newR = Math.floor(r * (1 - factor));
    const newG = Math.floor(g * (1 - factor));
    const newB = Math.floor(b * (1 - factor));
    
    // Convertir en hex
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
  }

  private createSlideTexture(slide: Slide, index: number): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    const isLastSlide = index === this.slides.length - 1;
    const isFirstThreeSlides = index < 3;

    if (isLastSlide) {
      // Slide 4 : diviser en 3 colonnes verticales égales (prêtes pour contenu)
      const sectionWidth = canvas.width / 3;
      const colors = ['#FF3366', '#33CCFF', '#66FF33']; // Couleurs temporaires

      // Colonne 1 (gauche) - Zone de contenu
      ctx.fillStyle = colors[0];
      ctx.fillRect(0, 0, sectionWidth, canvas.height);
      
      // Colonne 2 (milieu) - Zone de contenu
      ctx.fillStyle = colors[1];
      ctx.fillRect(sectionWidth, 0, sectionWidth, canvas.height);

      // Colonne 3 (droite) - Zone de contenu
      ctx.fillStyle = colors[2];
      ctx.fillRect(sectionWidth * 2, 0, sectionWidth, canvas.height);

      // Bordures entre les colonnes
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(sectionWidth, 0);
      ctx.lineTo(sectionWidth, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(sectionWidth * 2, 0);
      ctx.lineTo(sectionWidth * 2, canvas.height);
      ctx.stroke();

      // Labels temporaires pour indiquer les zones de contenu
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = 'bold 40px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Zone 1', sectionWidth / 2, canvas.height / 2);
      ctx.fillText('Zone 2', sectionWidth + sectionWidth / 2, canvas.height / 2);
      ctx.fillText('Zone 3', sectionWidth * 2 + sectionWidth / 2, canvas.height / 2);

      // Bordure extérieure
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 20;
      ctx.strokeRect(0, 0, canvas.width, canvas.height);
    } else if (isFirstThreeSlides) {
      // Slides 1, 2, 3 : diviser en 2 colonnes (60% et 40%)
      const leftColumnWidth = canvas.width * 0.6;
      const rightColumnWidth = canvas.width * 0.4;
      
      // Colonne gauche (60%) - Zone de contenu principale
      ctx.fillStyle = slide.color;
      ctx.fillRect(0, 0, leftColumnWidth, canvas.height);
      
      // Colonne droite (40%) - Zone de contenu secondaire
      const rightColumnColor = this.darkenColor(slide.color, 0.2);
      ctx.fillStyle = rightColumnColor;
      ctx.fillRect(leftColumnWidth, 0, rightColumnWidth, canvas.height);

      // Bordure entre les colonnes
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(leftColumnWidth, 0);
      ctx.lineTo(leftColumnWidth, canvas.height);
      ctx.stroke();

      // Labels temporaires pour indiquer les zones de contenu
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = 'bold 50px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Zone Principale', leftColumnWidth / 2, canvas.height / 2);
      ctx.fillText('Zone Secondaire', leftColumnWidth + rightColumnWidth / 2, canvas.height / 2);

      // Bordure extérieure
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 20;
      ctx.strokeRect(0, 0, canvas.width, canvas.height);
    } else {
      // Fallback pour autres slides (ne devrait pas arriver avec 4 slides)
      ctx.fillStyle = slide.color;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 20;
      ctx.strokeRect(0, 0, canvas.width, canvas.height);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());
    this.renderer.render(this.scene, this.camera);
  }

  private startAutoPlay(): void {
    this.stopAutoPlay(); // S'assurer qu'il n'y a pas d'intervalle en cours
    this.autoPlayInterval = window.setInterval(() => {
      this.goToNextSlide();
    }, 3000); // 3 secondes
  }

  private goToNextSlide(): void {
    // Méthode privée utilisée uniquement par l'auto-play
    this.activeSlide.set((this.activeSlide() + 1) % this.slides.length);
  }

  private stopAutoPlay(): void {
    if (this.autoPlayInterval) {
      clearInterval(this.autoPlayInterval);
      this.autoPlayInterval = undefined;
    }
  }

  private rotateToSlide(index: number): void {
    if (!this.carouselGroup) return;

    const anglePerSlide = (Math.PI * 2) / this.slides.length;
    
    // [MODIFICATION] Sens de rotation.
    // Pour inverser le sens, retirez ou ajoutez le signe '-' devant index.
    // Actuellement : Rotation positive pour aller au suivant (sens inverse des aiguilles d'une montre vu du haut ?)
    // Testons l'inverse de la précédente logique.
    const targetRotation = index * anglePerSlide; // Retiré le '-' pour inverser

    // Masquer tous les slides sauf celui actif
    this.slideMeshes.forEach((mesh, meshIndex) => {
      const material = mesh.material as THREE.MeshBasicMaterial;
      const isActive = meshIndex === index;
      
      // Réactiver la visibilité si c'est le slide actif
      if (isActive) {
        mesh.visible = true;
      }
      
      gsap.to(material, {
        opacity: isActive ? 1 : 0,
        duration: 0.8,
        ease: 'power2.inOut',
        onComplete: () => {
          // Désactiver complètement la visibilité pour les slides non actifs
          if (!isActive) {
            mesh.visible = false;
          }
        }
      });
    });

    gsap.to(this.carouselGroup.rotation, {
      y: targetRotation,
      duration: 1.5,
      ease: 'power3.out'
    });
  }

  private onResize(): void {
    if (!this.camera || !this.renderer) return;
    
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // Ajuster les paramètres de la caméra selon la taille de l'écran
    const cameraSettings = this.getCameraSettings();
    this.camera.fov = cameraSettings.fov;
    this.camera.aspect = width / height;
    this.camera.position.z = cameraSettings.zPosition;
    this.camera.updateProjectionMatrix();
    
    // Ajuster la taille du renderer
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  selectSlide(index: number): void {
    this.activeSlide.set(index);
    this.startAutoPlay(); // Réinitialiser l'auto-play après une sélection manuelle
  }

  nextSlide(): void {
    this.activeSlide.set((this.activeSlide() + 1) % this.slides.length);
    this.startAutoPlay(); // Réinitialiser l'auto-play après une navigation manuelle
  }

  previousSlide(): void {
    this.activeSlide.set((this.activeSlide() - 1 + this.slides.length) % this.slides.length);
    this.startAutoPlay(); // Réinitialiser l'auto-play après une navigation manuelle
  }

  getIndicatorDistance(indicatorIndex: number): number {
    const currentIndex = this.activeSlide();
    const totalSlides = this.slides.length;

    // Calcul de la distance la plus courte en considérant le carousel circulaire
    const directDistance = Math.abs(indicatorIndex - currentIndex);
    const wrapDistance = totalSlides - directDistance;

    return Math.min(directDistance, wrapDistance);
  }

  getIndicatorVisibility(indicatorIndex: number): boolean {
    const distance = this.getIndicatorDistance(indicatorIndex);
    // Montrer seulement l'indicateur actif et ses voisins immédiats
    return distance <= 1;
  }

  getIndicatorPosition(indicatorIndex: number): string {
    const currentIndex = this.activeSlide();
    const distance = this.getIndicatorDistance(indicatorIndex);
    const width = window.innerWidth;
    
    // Calculer l'offset selon la taille de l'écran
    let offset: number;
    let topPosition: number;
    let activeScale: number;
    let nearbyScale: number;
    
    if (width < 480) {
      // Petit mobile
      offset = 50;
      topPosition = 8;
      activeScale = 1.1;
      nearbyScale = 0.85;
    } else if (width < 768) {
      // Mobile
      offset = 60;
      topPosition = 10;
      activeScale = 1.15;
      nearbyScale = 0.85;
    } else if (width < 1024) {
      // Tablette
      offset = 65;
      topPosition = 15;
      activeScale = 1.2;
      nearbyScale = 0.9;
    } else {
      // Desktop
      offset = 70;
      topPosition = 20;
      activeScale = 1.3;
      nearbyScale = 0.9;
    }

    if (distance === 0) {
      // Indicateur actif : centré avec délai d'animation minimal
      return `left: 50%; top: ${topPosition}px; transform: translateX(-50%) scale(${activeScale}); z-index: 10; transition-delay: 0s;`;
    } else {
      // Indicateurs voisins : positionnés à gauche ou droite du centre
      let leftPosition = 50;
      let transitionDelay = '0.1s'; // Délai par défaut

      // Calculer la position relative
      if (indicatorIndex === currentIndex - 1 || (currentIndex === 0 && indicatorIndex === this.slides.length - 1)) {
        // Indicateur à gauche
        leftPosition = 50 - offset;
        transitionDelay = '0.15s'; // Délai légèrement plus long pour l'effet d'onde
      } else if (indicatorIndex === currentIndex + 1 || (currentIndex === this.slides.length - 1 && indicatorIndex === 0)) {
        // Indicateur à droite
        leftPosition = 50 + offset;
        transitionDelay = '0.2s'; // Délai plus long pour l'effet d'onde
      }

      return `left: ${leftPosition}%; top: ${topPosition}px; transform: translateX(-50%) scale(${nearbyScale}); z-index: 5; transition-delay: ${transitionDelay};`;
    }
  }

  getIndicatorTransitionDelay(indicatorIndex: number): string {
    const distance = this.getIndicatorDistance(indicatorIndex);
    // Délais croissants pour créer un effet d'onde
    switch (distance) {
      case 0: return '0s';      // Actif : immédiat
      case 1: return '0.15s';   // Voisins : léger délai
      default: return '0.3s';   // Plus lointains : délai plus long
    }
  }
}
