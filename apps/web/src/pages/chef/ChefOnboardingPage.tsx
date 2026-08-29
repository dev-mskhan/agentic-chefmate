import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChefHat,
  Clock,
  FileCheck2,
  Image as ImageIcon,
  MapPin,
  ShieldCheck,
  Sparkles,
  Utensils,
} from 'lucide-react'
import { PublicShell } from '../../components/templates/PublicShell'
import { PageContainer } from '../../components/templates/PageContainer'
import { Button } from '../../components/atoms/Button'
import { Dropdown } from '../../components/atoms/Dropdown'
import { Input } from '../../components/atoms/Input'
import { Badge } from '../../components/atoms/Badge'
import {
  createChefDish,
  updateChefSchedule,
} from '../../services/api/chefService'
import { useAuth } from '../../hooks/useAuth'

// Backend canonical cuisine values & labels per cuisine-categories.ts
const CUISINE_OPTIONS = [
  { value: 'PAKISTANI', label: 'Pakistani' },
  { value: 'PUNJABI', label: 'Punjabi' },
  { value: 'SINDHI', label: 'Sindhi' },
  { value: 'BALOCHI', label: 'Balochi' },
  { value: 'PASHTUN', label: 'Pashtun' },
  { value: 'KARAHI', label: 'Karahi & Handi' },
  { value: 'BBQ', label: 'Traditional BBQ' },
  { value: 'NORTH_INDIAN', label: 'Mughlai & North Indian' },
  { value: 'MIDDLE_EASTERN', label: 'Middle Eastern' },
  { value: 'CHINESE', label: 'Desi Chinese' },
  { value: 'CONTINENTAL', label: 'Continental' },
]

const MAJOR_CITIES = [
  'Lahore',
  'Karachi',
  'Islamabad',
  'Rawalpindi',
  'Faisalabad',
  'Multan',
  'Peshawar',
  'Quetta',
]

const STEPS = [
  { title: 'Identity & Bio', desc: 'Kitchen brand name and culinary story' },
  { title: 'Cuisine Specialties', desc: 'Select regional expertise' },
  { title: 'Service Area', desc: 'City, postal codes, and delivery radius' },
  { title: 'Kitchen Media', desc: 'Photos of prep area and authentic cookware' },
  { title: 'First Signature Dish', desc: 'Hero recipe with pricing & portions' },
  { title: 'Schedule & Capacity', desc: 'Operating days and daily limits' },
  { title: 'Review & Certification', desc: 'Platform verification submission' },
]

export function ChefOnboardingPage() {
  const navigate = useNavigate()
  const { user, isAuthenticated, switchRole } = useAuth()
  const [currentStep, setCurrentStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // 1. Identity & Bio
  const [displayName, setDisplayName] = useState(user?.displayName || "Ayesha's Lahore Dastarkhwan")
  const [bio, setBio] = useState(
    'Specializing in slow-cooked traditional Punjabi dishes, aromatic karahis, and authentic earthenware dum recipes passed down from my grandmother.',
  )
  const [phone, setPhone] = useState('+92-300-5550199')

  // 2. Cuisine Specialties
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>(['PUNJABI', 'KARAHI', 'PAKISTANI'])

  // 3. Service Area
  const [city, setCity] = useState('Lahore')
  const [postalCodesStr, setPostalCodesStr] = useState('54000, 54600, 54700')
  const [radiusKm, setRadiusKm] = useState('15')
  const [streetAddress, setStreetAddress] = useState('Gulberg III, Main Boulevard')

  // 4. Portfolio Media
  const [mediaUploaded, setMediaUploaded] = useState(true)

  // 5. First Signature Dish
  const [dishName, setDishName] = useState('Smoky Chicken Karahi')
  const [dishDescription, setDishDescription] = useState(
    'Cooked fresh to order in iron wok with organic tomatoes, crushed green chilies, julienne ginger, and freshly roasted cumin.',
  )
  const [dishPrice, setDishPrice] = useState('2400')
  const [dishPortion, setDishPortion] = useState('Serves 2-3')
  const [dishCategory, setDishCategory] = useState('Curry')
  const [dietaryTags, setDietaryTags] = useState<string[]>(['Halal'])

  // 6. Schedule & Capacity
  const [operatingDays, setOperatingDays] = useState<string[]>([
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ])
  const [dailyCapacity, setDailyCapacity] = useState('15')
  const [leadTimeHours, setLeadTimeHours] = useState('4')

  const toggleCuisine = (val: string) => {
    setSelectedCuisines((prev) =>
      prev.includes(val) ? prev.filter((c) => c !== val) : [...prev, val],
    )
  }

  const toggleDay = (day: string) => {
    setOperatingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    )
  }

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      handleSubmitApplication()
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleSubmitApplication = async () => {
    setSubmitting(true)

    // Save signature dish
    await createChefDish({
      name: dishName,
      description: dishDescription,
      price: Number(dishPrice) || 2400,
      portionInfo: dishPortion,
      cuisine: selectedCuisines[0] || 'Punjabi',
      category: dishCategory,
      dietaryTags,
    })

    // Save schedule & capacity
    await updateChefSchedule({
      weeklyDays: operatingDays,
      dailyCapacity: Number(dailyCapacity) || 15,
      leadTimeHours: Number(leadTimeHours) || 4,
    })

    // Switch auth session to CHEF role
    switchRole('CHEF')

    setSubmitting(false)
    setSubmitted(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Pre-onboarding gate for visitors not signed up yet
  if (!isAuthenticated || !user) {
    return (
      <PublicShell>
        <PageContainer className="pb-24 pt-12 max-w-xl text-center space-y-6">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-terracotta-10 text-terracotta border border-terracotta/20 shadow-sm">
            <ChefHat size={40} />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-terracotta-10 text-terracotta px-3.5 py-1 text-xs font-bold uppercase tracking-wider">
              <Sparkles size={14} /> Chef Partner Collective
            </span>
            <h1 className="font-display text-3xl sm:text-4xl text-charcoal tracking-tight">
              Join the ChefMate Culinary Collective
            </h1>
            <p className="text-xs sm:text-sm text-charcoal-70 leading-relaxed max-w-md mx-auto">
              To publish your family recipes, set your prep capacity, and receive weekly payouts, please create your chef account or sign in first.
            </p>
          </div>

          {/* Benefits summary card */}
          <div className="rounded-3xl bg-cream border border-charcoal/10 shadow-sm p-6 text-left space-y-3.5 text-xs text-charcoal">
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 rounded-full bg-sage/15 text-sage flex items-center justify-center shrink-0 font-bold">
                ✓
              </div>
              <p>Keep 100% control of your menu, portion sizes, and pricing.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 rounded-full bg-sage/15 text-sage flex items-center justify-center shrink-0 font-bold">
                ✓
              </div>
              <p>Set daily maximum capacity to protect your small-batch rhythm.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 rounded-full bg-sage/15 text-sage flex items-center justify-center shrink-0 font-bold">
                ✓
              </div>
              <p>Guaranteed direct weekly bank deposits with full ledger audit.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              onClick={() => navigate('/signup?returnTo=/chef/onboarding&mode=chef')}
              className="w-full sm:w-auto py-3 px-7 text-xs gap-2 justify-center"
            >
              Create Chef Account <ArrowRight size={15} />
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate('/signin?returnTo=/chef/onboarding')}
              className="w-full sm:w-auto py-3 px-6 text-xs justify-center"
            >
              Sign In to Existing Account
            </Button>
          </div>
        </PageContainer>
      </PublicShell>
    )
  }

  if (submitted) {
    return (
      <PublicShell>
        <PageContainer className="pb-24 pt-12 max-w-2xl text-center space-y-6">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-sage/15 text-sage">
            <Check size={40} />
          </div>

          <div>
            <Badge tone="warning">Status: Pending Verification</Badge>
            <h1 className="font-display text-3xl sm:text-4xl text-charcoal tracking-tight mt-3">
              Application Submitted for Approval
            </h1>
            <p className="text-xs text-charcoal-70 mt-2 leading-relaxed max-w-lg mx-auto">
              Your home kitchen profile for <strong>{displayName}</strong> has been received by our culinary audit team. Once verified, your kitchen will automatically accept live customer orders.
            </p>
          </div>

          {/* Application Receipt Card */}
          <div className="rounded-3xl bg-cream border border-charcoal/10 shadow-sm p-6 text-left space-y-4 max-w-lg mx-auto text-xs">
            <div className="flex justify-between items-center border-b border-charcoal/10 pb-3">
              <span className="text-charcoal-70">Kitchen Identity:</span>
              <strong className="text-charcoal font-bold">{displayName}</strong>
            </div>
            <div className="flex justify-between items-center border-b border-charcoal/10 pb-3">
              <span className="text-charcoal-70">Service City & Radius:</span>
              <strong className="text-charcoal">{city} ({radiusKm} km radius)</strong>
            </div>
            <div className="flex justify-between items-center border-b border-charcoal/10 pb-3">
              <span className="text-charcoal-70">Primary Cuisines:</span>
              <strong className="text-charcoal">{selectedCuisines.join(', ')}</strong>
            </div>
            <div className="flex justify-between items-center border-b border-charcoal/10 pb-3">
              <span className="text-charcoal-70">Signature Dish:</span>
              <strong className="text-charcoal">{dishName} (PKR {Number(dishPrice).toLocaleString()})</strong>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-charcoal-70">Daily Prep Limit:</span>
              <strong className="text-terracotta">{dailyCapacity} orders / day</strong>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Button
              onClick={() => navigate('/chef')}
              className="w-full sm:w-auto py-3 px-6 text-xs gap-2"
            >
              <ChefHat size={16} /> Open Calm Kitchen Workspace
            </Button>
            <Link
              to="/chefs/chef-ayesha-khan"
              className="inline-flex min-h-11 items-center justify-center rounded-pill bg-cream border border-charcoal/15 px-6 text-xs font-bold text-charcoal hover:bg-cream-dim w-full sm:w-auto transition-colors"
            >
              Preview Public Kitchen Profile
            </Link>
          </div>
        </PageContainer>
      </PublicShell>
    )
  }

  return (
    <PublicShell>
      <PageContainer className="pb-24 pt-8 sm:pt-12 max-w-3xl space-y-8">
        {/* Header Ribbon */}
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-terracotta flex items-center gap-1.5">
            <Sparkles size={14} /> Chef Onboarding & Certification
          </span>
          <h1 className="font-display text-3xl sm:text-4xl text-charcoal tracking-tight mt-1">
            Join the ChefMate Culinary Collective
          </h1>
          <p className="text-xs text-charcoal-70 mt-1">
            Publish authentic home cooking, manage small-batch capacities, and earn with guaranteed weekly disbursements.
          </p>
        </div>

        {/* Stepper Navigation */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-charcoal">
            <span className="text-terracotta uppercase">
              Step {currentStep + 1} of {STEPS.length}: {STEPS[currentStep].title}
            </span>
            <span className="text-charcoal-70 hidden sm:inline">{STEPS[currentStep].desc}</span>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {STEPS.map((step, idx) => (
              <div
                key={step.title}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx <= currentStep ? 'bg-terracotta' : 'bg-charcoal/10'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Dynamic Form Step Card */}
        <div className="rounded-3xl bg-cream border border-charcoal/10 shadow-sm p-6 sm:p-10 space-y-6">
          {/* ── Step 1: Identity & Bio ───────────────────────────────── */}
          {currentStep === 0 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="space-y-1">
                <h2 className="font-display text-2xl text-charcoal flex items-center gap-2">
                  <ChefHat size={20} className="text-terracotta" /> Kitchen Identity & Story
                </h2>
                <p className="text-xs text-charcoal-70">
                  Introduce your home kitchen and culinary background to local food lovers.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-charcoal">
                    Kitchen Display Name (2-60 characters) *
                  </label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Ayesha's Lahore Dastarkhwan"
                    maxLength={60}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-charcoal">
                    Contact Phone Number (for order delivery coordination) *
                  </label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+92-300-5550199"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-semibold text-charcoal">
                      Chef Story & Cooking Philosophy
                    </label>
                    <span className="text-[10px] text-charcoal-70">
                      {bio.length}/1000 characters
                    </span>
                  </div>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={4}
                    maxLength={1000}
                    placeholder="Share the origins of your recipes, heritage cookware, and passion for wholesome homemade dining..."
                    className="w-full rounded-2xl border border-charcoal/15 bg-cream-dim p-3.5 text-xs outline-none focus:border-terracotta leading-relaxed"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Cuisine Specialties ─────────────────────────── */}
          {currentStep === 1 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="space-y-1">
                <h2 className="font-display text-2xl text-charcoal flex items-center gap-2">
                  <Utensils size={20} className="text-terracotta" /> Regional Cuisine Specialties
                </h2>
                <p className="text-xs text-charcoal-70">
                  Select the culinary styles and regional recipes you master (minimum 1).
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
                {CUISINE_OPTIONS.map((c) => {
                  const active = selectedCuisines.includes(c.value)
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => toggleCuisine(c.value)}
                      className={`flex items-center justify-between rounded-2xl p-3.5 border text-left transition-all ${
                        active
                          ? 'bg-terracotta text-cream border-terracotta shadow-sm ring-1 ring-terracotta'
                          : 'bg-cream-dim text-charcoal-70 border-charcoal/10 hover:border-charcoal/30'
                      }`}
                    >
                      <span className="text-xs font-bold">{c.label}</span>
                      {active && <Check size={14} className="shrink-0 text-cream" />}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Step 3: Service Area ────────────────────────────────── */}
          {currentStep === 2 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="space-y-1">
                <h2 className="font-display text-2xl text-charcoal flex items-center gap-2">
                  <MapPin size={20} className="text-terracotta" /> Service Area & Delivery Radius
                </h2>
                <p className="text-xs text-charcoal-70">
                  Define the city and local sectors where your hot meals can be delivered fresh.
                </p>
              </div>

              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-charcoal">
                      Operating City *
                    </label>
                    <Dropdown
                      value={city}
                      onChange={(val) => setCity(val)}
                      ariaLabel="Operating city"
                      options={MAJOR_CITIES.map((c) => ({ value: c, label: c }))}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-charcoal">
                      Delivery Radius (km): <strong className="text-terracotta">{radiusKm} km</strong>
                    </label>
                    <input
                      type="range"
                      min="3"
                      max="30"
                      value={radiusKm}
                      onChange={(e) => setRadiusKm(e.target.value)}
                      className="w-full accent-terracotta py-2 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-charcoal">
                    Kitchen Location & Landmark *
                  </label>
                  <Input
                    value={streetAddress}
                    onChange={(e) => setStreetAddress(e.target.value)}
                    placeholder="e.g. Gulberg III, near Liberty Market"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-charcoal">
                    Covered Postal Codes (comma-separated)
                  </label>
                  <Input
                    value={postalCodesStr}
                    onChange={(e) => setPostalCodesStr(e.target.value)}
                    placeholder="54000, 54600, 54700"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Step 4: Kitchen Media ───────────────────────────────── */}
          {currentStep === 3 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="space-y-1">
                <h2 className="font-display text-2xl text-charcoal flex items-center gap-2">
                  <ImageIcon size={20} className="text-terracotta" /> Kitchen & Workstation Media
                </h2>
                <p className="text-xs text-charcoal-70">
                  Upload clear photos of your cooking setup, clean prep area, and earthenware/iron pots.
                </p>
              </div>

              <div className="rounded-3xl border-2 border-dashed border-charcoal/20 bg-cream-dim p-8 text-center space-y-3">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-terracotta-10 text-terracotta">
                  <ImageIcon size={28} />
                </div>
                <div>
                  <strong className="text-xs font-bold text-charcoal block">
                    {mediaUploaded ? '3 Kitchen Photos Attached' : 'Drop photos here or click to browse'}
                  </strong>
                  <span className="text-[11px] text-charcoal-70">
                    High resolution JPG, PNG, WEBP up to 10MB each
                  </span>
                </div>
                <div className="flex justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setMediaUploaded(true)}
                    className="rounded-pill bg-cream border border-charcoal/15 px-4 py-1.5 text-xs font-semibold text-charcoal hover:border-terracotta"
                  >
                    Select Images
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 5: First Signature Dish ────────────────────────── */}
          {currentStep === 4 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="space-y-1">
                <h2 className="font-display text-2xl text-charcoal flex items-center gap-2">
                  <Utensils size={20} className="text-terracotta" /> First Signature Dish
                </h2>
                <p className="text-xs text-charcoal-70">
                  Publish the specialty dish your customers will order first.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-charcoal">Dish Title *</label>
                  <Input
                    value={dishName}
                    onChange={(e) => setDishName(e.target.value)}
                    placeholder="e.g. Smoky Chicken Karahi"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-charcoal">
                    Recipe & Flavor Description *
                  </label>
                  <textarea
                    value={dishDescription}
                    onChange={(e) => setDishDescription(e.target.value)}
                    rows={3}
                    placeholder="Describe the aroma, spice blend, and tenderness..."
                    className="w-full rounded-2xl border border-charcoal/15 bg-cream-dim p-3.5 text-xs outline-none focus:border-terracotta leading-relaxed"
                    required
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-charcoal">
                      Price per Portion (PKR) *
                    </label>
                    <Input
                      type="number"
                      value={dishPrice}
                      onChange={(e) => setDishPrice(e.target.value)}
                      placeholder="2400"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-charcoal">Portion Size *</label>
                    <Input
                      value={dishPortion}
                      onChange={(e) => setDishPortion(e.target.value)}
                      placeholder="Serves 2-3"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-charcoal">Dish Category</label>
                    <Dropdown
                      value={dishCategory}
                      onChange={(val) => setDishCategory(val)}
                      ariaLabel="Dish category"
                      options={[
                        { value: 'Curry', label: 'Curry' },
                        { value: 'Rice', label: 'Rice & Biryani' },
                        { value: 'BBQ', label: 'BBQ' },
                        { value: 'Bread', label: 'Bread & Naan' },
                        { value: 'Dessert', label: 'Dessert' },
                      ]}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-charcoal">Dietary Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {['Halal', 'Organic Chicken', 'Gluten-Free', 'High Protein'].map((tag) => {
                      const active = dietaryTags.includes(tag)
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() =>
                            setDietaryTags((prev) =>
                              prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
                            )
                          }
                          className={`rounded-pill px-3.5 py-1 text-xs font-semibold border transition-all ${
                            active
                              ? 'bg-terracotta text-cream border-terracotta'
                              : 'bg-cream-dim text-charcoal-70 border-charcoal/10'
                          }`}
                        >
                          {tag}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 6: Schedule & Capacity ─────────────────────────── */}
          {currentStep === 5 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="space-y-1">
                <h2 className="font-display text-2xl text-charcoal flex items-center gap-2">
                  <Clock size={20} className="text-terracotta" /> Operating Schedule & Prep Limits
                </h2>
                <p className="text-xs text-charcoal-70">
                  Protect your cooking rhythm by setting daily max capacity and working days.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-charcoal mb-2">
                    Weekly Operating Days
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(
                      (day) => {
                        const active = operatingDays.includes(day)
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => toggleDay(day)}
                            className={`rounded-pill px-3.5 py-1.5 text-xs font-semibold border transition-all ${
                              active
                                ? 'bg-terracotta text-cream border-terracotta shadow-sm'
                                : 'bg-cream-dim text-charcoal-70 border-charcoal/10'
                            }`}
                          >
                            {day}
                          </button>
                        )
                      },
                    )}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 pt-2">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-charcoal">
                      Daily Max Order Capacity (orders/day)
                    </label>
                    <Input
                      type="number"
                      min="1"
                      max="50"
                      value={dailyCapacity}
                      onChange={(e) => setDailyCapacity(e.target.value)}
                    />
                    <span className="text-[10px] text-charcoal-70">
                      Capped automatically when limit is reached.
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-charcoal">
                      Minimum Advance Notice (Hours)
                    </label>
                    <Input
                      type="number"
                      min="1"
                      max="48"
                      value={leadTimeHours}
                      onChange={(e) => setLeadTimeHours(e.target.value)}
                    />
                    <span className="text-[10px] text-charcoal-70">
                      Required advance time for fresh prep.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 7: Review & Certification ──────────────────────── */}
          {currentStep === 6 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="space-y-1">
                <h2 className="font-display text-2xl text-charcoal flex items-center gap-2">
                  <FileCheck2 size={20} className="text-terracotta" /> Review & Submit for Certification
                </h2>
                <p className="text-xs text-charcoal-70">
                  Verify your details before our culinary verification audit.
                </p>
              </div>

              <div className="rounded-3xl bg-cream-dim p-6 border border-charcoal/10 space-y-4 text-xs">
                <div className="flex justify-between items-start border-b border-charcoal/10 pb-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-terracotta block">
                      Kitchen Identity
                    </span>
                    <strong className="text-sm font-bold text-charcoal block">{displayName}</strong>
                    <p className="text-charcoal-70">{phone} · {city} ({radiusKm} km radius)</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(0)}
                    className="text-xs font-semibold text-terracotta hover:underline"
                  >
                    Edit
                  </button>
                </div>

                <div className="flex justify-between items-start border-b border-charcoal/10 pb-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-terracotta block">
                      Specialties & Cuisines
                    </span>
                    <strong className="text-charcoal">{selectedCuisines.join(', ')}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="text-xs font-semibold text-terracotta hover:underline"
                  >
                    Edit
                  </button>
                </div>

                <div className="flex justify-between items-start border-b border-charcoal/10 pb-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-terracotta block">
                      First Signature Dish
                    </span>
                    <strong className="text-charcoal">{dishName}</strong>
                    <p className="text-charcoal-70">
                      PKR {Number(dishPrice).toLocaleString()} · {dishPortion}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(4)}
                    className="text-xs font-semibold text-terracotta hover:underline"
                  >
                    Edit
                  </button>
                </div>

                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-terracotta block">
                      Capacity Rhythm
                    </span>
                    <strong className="text-charcoal">
                      {dailyCapacity} orders/day · {operatingDays.join(', ')}
                    </strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(5)}
                    className="text-xs font-semibold text-terracotta hover:underline"
                  >
                    Edit
                  </button>
                </div>
              </div>

              <div className="rounded-2xl bg-terracotta-10 p-4 border border-terracotta/20 flex items-center gap-3 text-xs text-charcoal">
                <ShieldCheck size={20} className="text-terracotta shrink-0" />
                <p>
                  By submitting, you agree to ChefMate's hygiene standards and fresh small-batch quality commitment.
                </p>
              </div>
            </div>
          )}

          {/* Stepper Navigation Buttons */}
          <div className="flex items-center justify-between pt-6 border-t border-charcoal/10">
            {currentStep > 0 ? (
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-1.5 text-xs font-semibold text-charcoal-70 hover:text-charcoal"
              >
                <ArrowLeft size={14} /> Back to Step {currentStep}
              </button>
            ) : (
              <span />
            )}

            <Button
              onClick={handleNext}
              disabled={submitting}
              className="text-xs py-2.5 px-6 gap-2"
            >
              {currentStep === STEPS.length - 1 ? (
                submitting ? 'Submitting Application...' : 'Submit Application'
              ) : (
                <>
                  Continue to {STEPS[currentStep + 1].title} <ArrowRight size={14} />
                </>
              )}
            </Button>
          </div>
        </div>
      </PageContainer>
    </PublicShell>
  )
}
