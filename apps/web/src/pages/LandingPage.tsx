import { DiscoverySection } from '../components/organisms/DiscoverySection'
import { CitySection } from '../components/organisms/CitySection'
import { ChefStorySection } from '../components/organisms/ChefStorySection'
import { HeroSection } from '../components/organisms/HeroSection'
import { HowItWorksSection } from '../components/organisms/HowItWorksSection'
import { PlatformSection } from '../components/organisms/PlatformSection'
import { SiteFooter } from '../components/organisms/SiteFooter'
import { StickyNav } from '../components/organisms/StickyNav'

export function LandingPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-cream text-charcoal">
      <StickyNav />
      <main>
        <HeroSection />
        <DiscoverySection />
        <CitySection />
        <PlatformSection />
        <HowItWorksSection />
        <ChefStorySection />
      </main>
      <SiteFooter />
    </div>
  )
}
