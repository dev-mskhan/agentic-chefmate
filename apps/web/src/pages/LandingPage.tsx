import { DiscoverySection } from '../components/organisms/DiscoverySection'
import { CitySection } from '../components/organisms/CitySection'
import { ChefStorySection } from '../components/organisms/ChefStorySection'
import { HeroSection } from '../components/organisms/HeroSection'
import { HowItWorksSection } from '../components/organisms/HowItWorksSection'
import { PlatformSection } from '../components/organisms/PlatformSection'
import { PublicShell } from '../components/templates/PublicShell'

export function LandingPage() {
  return (
    <PublicShell navigation={[{ label: 'Discover', href: '/discover' }, { label: 'Chefs', href: '/discover?type=chefs' }, { label: 'Dishes', href: '/discover?type=dishes' }, { label: 'Meal plans', href: '/discover?type=meal-plans' }, { label: 'Basket', href: '/cart' }]}>
      <main>
        <HeroSection />
        <DiscoverySection />
        <CitySection />
        <PlatformSection />
        <HowItWorksSection />
        <ChefStorySection />
      </main>
    </PublicShell>
  )
}
