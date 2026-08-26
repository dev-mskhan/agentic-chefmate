import { Link } from 'react-router-dom'

const cities = [
  { name: 'Lahore', image: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=900&q=80' },
  { name: 'Karachi', image: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80' },
  { name: 'Islamabad', image: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=900&q=80' },
  { name: 'Rawalpindi', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80' },
]

export function CitySection() {
  return (
    <section className="mx-auto max-w-[1500px] px-4 py-20 sm:px-8 lg:px-12 lg:py-28 2xl:px-16">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-terracotta">Start nearby</p><h2 className="mt-4 max-w-[16ch] font-display text-5xl leading-[0.96] tracking-[-0.035em] sm:text-6xl">Good food has an address.</h2></div>
        <p className="max-w-[28ch] text-sm leading-6 text-charcoal-70">Browse the cooks and menus shaping your city.</p>
      </div>
      <div className="mt-10 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cities.map((city, index) => (
          <Link key={city.name} to={`/discover?type=chefs&city=${city.name}`} className={`group relative overflow-hidden rounded-[1.6rem] ${index % 2 ? 'mt-8 max-sm:mt-0' : ''}`}>
            <img className="aspect-[4/5] w-full object-cover transition-transform duration-700 group-hover:scale-105" src={city.image} alt={`${city.name} food discovery`} loading="lazy" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-charcoal/75 to-transparent px-5 pb-5 pt-14"><span className="font-display text-3xl text-cream">{city.name}</span></div>
          </Link>
        ))}
      </div>
    </section>
  )
}
