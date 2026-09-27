import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Container from '../../components/common/Container.jsx';
import { RESTAURANT_CONFIG } from '../../constants/restaurantConfig.js';

/**
 * Gallery Items Definition
 * Uses ONLY verified, existing local images from frontend/public/images/menu/
 * Real dishes from the 16-category vegetarian menu catalog.
 */
const GALLERY_ITEMS = [
  // 1. Signature Dishes
  {
    id: 'gal-sig-1',
    title: 'Paneer Happiness Special',
    category: 'Signature Dishes',
    image: '/images/menu/paneer-happiness-spl.jpg',
    description: 'Chef special rich cashew gravy topped with stuffed paneer parcels.',
  },
  {
    id: 'gal-sig-2',
    title: 'Veg Happiness Special',
    category: 'Signature Dishes',
    image: '/images/menu/veg_happiness_spl.jpg',
    description: 'House specialty medley of fresh vegetables simmered in aromatic gravy.',
  },
  {
    id: 'gal-sig-3',
    title: 'Paneer Jaisalmer',
    category: 'Signature Dishes',
    image: '/images/menu/paneer-jaisalmer.jpg',
    description: 'Royal Rajasthani spiced curry with tender cottage cheese cubes.',
  },
  {
    id: 'gal-sig-4',
    title: 'Paneer Angara',
    category: 'Signature Dishes',
    image: '/images/menu/paneer-angara.jpg',
    description: 'Smoky tandoori paneer simmered in robust charcoal-infused gravy.',
  },

  // 2. Paneer Specialties
  {
    id: 'gal-pan-1',
    title: 'Paneer Butter Masala',
    category: 'Paneer Specialties',
    image: '/images/menu/paneer_butter_masala.jpg',
    description: 'Silky smooth tomato-butter gravy with succulent paneer cubes.',
  },
  {
    id: 'gal-pan-2',
    title: 'Paneer Tikka Masala',
    category: 'Paneer Specialties',
    image: '/images/menu/paneer_tikka_masala.jpg',
    description: 'Clay-oven charred paneer in medium-spiced onion-tomato gravy.',
  },
  {
    id: 'gal-pan-3',
    title: 'Paneer Kadhai',
    category: 'Paneer Specialties',
    image: '/images/menu/paneer_kadhai.jpg',
    description: 'Tossed with crunchy bell peppers, onions, and freshly ground coriander.',
  },
  {
    id: 'gal-pan-4',
    title: 'Palak Paneer',
    category: 'Paneer Specialties',
    image: '/images/menu/palak_paneer.jpg',
    description: 'Pureed garden spinach tempered with garlic and soft paneer.',
  },

  // 3. Starters
  {
    id: 'gal-str-1',
    title: 'Paneer Tikka Dry',
    category: 'Starters',
    image: '/images/menu/paneer-tikka-dry.webp',
    description: 'Marinated in spiced curd and skewered in the traditional tandoor.',
  },
  {
    id: 'gal-str-2',
    title: 'Veg Manchurian Dry',
    category: 'Starters',
    image: '/images/menu/veg-manchurian.webp',
    description: 'Crispy fried vegetable florets tossed in garlic-ginger soy sauce.',
  },
  {
    id: 'gal-str-3',
    title: 'Paneer Chilly',
    category: 'Starters',
    image: '/images/menu/paneer-chilly.webp',
    description: 'Crispy paneer cubes tossed with green chilies, capsicum, and scallions.',
  },
  {
    id: 'gal-str-4',
    title: 'Veg Crispy',
    category: 'Starters',
    image: '/images/menu/veg-crispy.webp',
    description: 'Golden fried seasonal vegetables glazed in tangy sweet-chilly sauce.',
  },

  // 4. Pizza
  {
    id: 'gal-piz-1',
    title: 'Happiness Special Pizza',
    category: 'Pizza',
    image: '/images/menu/hapinezz-sp-pizza.jpg',
    description: 'Loaded with mixed vegetable toppings, melted mozzarella, and house herbs.',
  },
  {
    id: 'gal-piz-2',
    title: 'Paneer Pizza',
    category: 'Pizza',
    image: '/images/menu/paneer-pizza.jpg',
    description: 'Spiced marinated paneer chunks on a crispy golden baked crust.',
  },
  {
    id: 'gal-piz-3',
    title: 'Veg Cheese Pizza',
    category: 'Pizza',
    image: '/images/menu/veg-cheese-pizza.jpg',
    description: 'Classic combination of garden veggies, rich tomato base, and cheese.',
  },
  {
    id: 'gal-piz-4',
    title: 'Onion Tomato Capsicum Pizza',
    category: 'Pizza',
    image: '/images/menu/onion-tomato-capsicum-pizza.jpg',
    description: 'Fresh farm-crisp trio on aromatic herb sauce with melted cheese.',
  },

  // 5. Chinese
  {
    id: 'gal-chn-1',
    title: 'Veg Hakka Noodles',
    category: 'Chinese',
    image: '/images/menu/veg-hakka-noodles.jpg',
    description: 'Wok-tossed noodles with shredded cabbage, carrots, and spring onions.',
  },
  {
    id: 'gal-chn-2',
    title: 'Veg Schezwan Noodles',
    category: 'Chinese',
    image: '/images/menu/veg-schezwan-noodles.jpg',
    description: 'Fiery wok-fried noodles tossed in our signature spicy Schezwan sauce.',
  },
  {
    id: 'gal-chn-3',
    title: 'Veg Manchurian Gravy',
    category: 'Chinese',
    image: '/images/menu/veg-manchurian-gravy.jpg',
    description: 'Vegetable dumplings simmered in rich, flavorful Chinese brown gravy.',
  },
  {
    id: 'gal-chn-4',
    title: 'Paneer Chilly Gravy',
    category: 'Chinese',
    image: '/images/menu/paneer-chilly-gravy.jpg',
    description: 'Cottage cheese cubes bathed in spicy soya-chilly gravy with bell peppers.',
  },

  // 6. Rice & Biryani
  {
    id: 'gal-rc-1',
    title: 'Hyderabadi Veg Biryani',
    category: 'Rice & Biryani',
    image: '/images/menu/veg-biryani.jpg',
    description: 'Fragrant basmati rice layered with garden vegetables and saffron spices.',
  },
  {
    id: 'gal-rc-2',
    title: 'Veg Fried Rice',
    category: 'Rice & Biryani',
    image: '/images/menu/veg-fried-rice.jpg',
    description: 'Stir-fried long grain rice with diced vegetables and mild oriental seasoning.',
  },
  {
    id: 'gal-rc-3',
    title: 'Vegetable Pulav',
    category: 'Rice & Biryani',
    image: '/images/menu/veg-pulav.jpg',
    description: 'Delicately spiced basmati rice infused with ghee and fresh green peas.',
  },
  {
    id: 'gal-rc-4',
    title: 'Triple Schezwan Fried Rice',
    category: 'Rice & Biryani',
    image: '/images/menu/triple-schezwan-fried-rice.jpg',
    description: 'Combination of spicy fried rice, noodles, and crispy Schezwan gravy.',
  },

  // 7. Indian Breads
  {
    id: 'gal-brd-1',
    title: 'Tandoori Roti',
    category: 'Indian Breads',
    image: '/images/menu/tandoori_roti.jpg',
    description: 'Whole wheat flatbread baked fresh in our traditional charcoal tandoor.',
  },
  {
    id: 'gal-brd-2',
    title: 'Butter Naan',
    category: 'Indian Breads',
    image: '/images/menu/butter_naan.jpg',
    description: 'Soft, layered leavened bread brushed generously with pure butter.',
  },
  {
    id: 'gal-brd-3',
    title: 'Plain Naan',
    category: 'Indian Breads',
    image: '/images/menu/naan.jpg',
    description: 'Classic clay-oven baked bread with crisp edges and pillow-soft center.',
  },
  {
    id: 'gal-brd-4',
    title: 'Lachha Paratha',
    category: 'Indian Breads',
    image: '/images/menu/paratha.jpg',
    description: 'Multi-layered flaky whole wheat flatbread cooked with ghee.',
  },

  // 8. Beverages
  {
    id: 'gal-bev-1',
    title: 'Coca-Cola (Chilled)',
    category: 'Beverages',
    image: '/images/menu/coca-cola.png',
    description: 'Refreshing carbonated soft drink served perfectly chilled for takeaway.',
  },
  {
    id: 'gal-bev-2',
    title: 'Thums Up (Chilled)',
    category: 'Beverages',
    image: '/images/menu/thumps-up.png',
    description: 'Strong, bubbly cola with an energetic taste profile.',
  },
  {
    id: 'gal-bev-3',
    title: 'Sprite (Chilled)',
    category: 'Beverages',
    image: '/images/menu/sprite.png',
    description: 'Crisp lemon-lime flavored beverage, light and bubbly.',
  },
  {
    id: 'gal-bev-4',
    title: 'Packaged Mineral Water',
    category: 'Beverages',
    image: '/images/menu/mineral-water.png',
    description: 'Pure, sealed drinking water bottle for safe refreshment.',
  },
];

const CATEGORIES = [
  'All Dishes',
  'Signature Dishes',
  'Paneer Specialties',
  'Starters',
  'Pizza',
  'Chinese',
  'Rice & Biryani',
  'Indian Breads',
  'Beverages',
];

/**
 * GalleryPage Component
 * Official Restaurant Food Gallery for HAPPINESS RESTAURANT
 *
 * Requirements:
 * - Uses ONLY existing valid images from frontend/public/images/
 * - Responsive image grid with consistent card ratios
 * - object-fit: cover, rounded corners, subtle hover effects
 * - Pure vegetarian visual language
 * - Category filter tabs
 * - Interactive modal image preview
 */
export default function GalleryPage() {
  const [selectedCategory, setSelectedCategory] = useState('All Dishes');
  const [activeModalItem, setActiveModalItem] = useState(null);

  const filteredItems = useMemo(() => {
    if (selectedCategory === 'All Dishes') {
      return GALLERY_ITEMS;
    }
    return GALLERY_ITEMS.filter((item) => item.category === selectedCategory);
  }, [selectedCategory]);

  return (
    <div className="w-full bg-secondary min-h-screen pb-16 sm:pb-24">
      {/* 1. BREADCRUMBS */}
      <div className="bg-white border-b border-surface-border py-3">
        <Container>
          <nav aria-label="Breadcrumb" className="text-xs text-muted">
            <ol className="flex items-center space-x-1.5">
              <li>
                <Link to="/" className="hover:text-primary transition-colors">
                  Home
                </Link>
              </li>
              <li aria-hidden="true" className="text-muted-light">
                &rarr;
              </li>
              <li className="font-semibold text-primary" aria-current="page">
                Gallery
              </li>
            </ol>
          </nav>
        </Container>
      </div>

      {/* 2. HERO SECTION */}
      <section
        className="relative overflow-hidden bg-secondary py-12 sm:py-16 border-b border-surface-border"
        aria-labelledby="gallery-hero-title"
      >
        <div
          className="absolute top-0 right-1/4 -z-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl pointer-events-none"
          aria-hidden="true"
        />
        <Container>
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-surface-border shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-veg" />
              <span className="text-[11px] sm:text-xs font-bold tracking-wider text-muted uppercase">
                100% PURE VEGETARIAN DELICACIES
              </span>
            </div>

            <h1
              id="gallery-hero-title"
              className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-primary tracking-tight leading-tight"
            >
              HAPPINESS RESTAURANT Food Gallery
            </h1>

            <p className="text-base sm:text-lg text-muted max-w-2xl mx-auto leading-relaxed">
              Explore our freshly prepared vegetarian culinary creations, cooked fresh and ready for your parcel pickup.
            </p>
          </div>
        </Container>
      </section>

      {/* 3. CATEGORY FILTER TABS */}
      <section className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-surface-border shadow-2xs py-3.5">
        <Container>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none sm:justify-center">
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat;
              const count =
                cat === 'All Dishes'
                  ? GALLERY_ITEMS.length
                  : GALLERY_ITEMS.filter((i) => i.category === cat).length;

              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-accent ${
                    isSelected
                      ? 'bg-primary text-white shadow-xs'
                      : 'bg-secondary text-muted hover:text-primary hover:bg-secondary-dark'
                  }`}
                  aria-pressed={isSelected}
                >
                  <span>{cat}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isSelected
                        ? 'bg-accent/20 text-accent font-bold'
                        : 'bg-surface-border text-muted'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </Container>
      </section>

      {/* 4. GALLERY GRID */}
      <section className="py-10 sm:py-14" aria-label="Restaurant Food Photographs">
        <Container>
          <div className="mb-6 flex items-center justify-between text-xs text-muted">
            <span>
              Showing <strong className="text-primary font-bold">{filteredItems.length}</strong> vegetarian dishes
            </span>
            <span className="hidden sm:inline text-accent font-semibold">
              Self-Pickup Parcel Packaging
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.map((item) => (
              <article
                key={item.id}
                className="bg-white rounded-2xl border border-surface-border overflow-hidden shadow-2xs hover:shadow-md hover:border-accent/40 transition-all duration-300 flex flex-col group"
              >
                {/* Image Container with Consistent 4:3 Ratio */}
                <div
                  className="relative aspect-[4/3] w-full overflow-hidden bg-secondary cursor-pointer"
                  onClick={() => setActiveModalItem(item)}
                >
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 block"
                    loading="lazy"
                  />

                  {/* Pure Veg Green Badge */}
                  <div
                    className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs p-1 rounded-md border border-veg/30 shadow-2xs"
                    title="Pure Vegetarian"
                    aria-label="Pure Vegetarian Indicator"
                  >
                    <div className="w-3 h-3 border border-veg flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-veg" />
                    </div>
                  </div>

                  {/* Category Pill */}
                  <span className="absolute top-3 right-3 px-2.5 py-0.5 rounded-full bg-black/70 backdrop-blur-xs text-white text-[10px] font-semibold tracking-wide">
                    {item.category}
                  </span>

                  {/* Hover Overlay Prompt */}
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                    <span className="px-3 py-1.5 rounded-xl bg-white/90 text-primary text-xs font-bold shadow-xs">
                      View Dish
                    </span>
                  </div>
                </div>

                {/* Card Info */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                  <div>
                    <h2 className="font-bold text-sm text-primary group-hover:text-amber-800 transition-colors">
                      {item.title}
                    </h2>
                    <p className="text-xs text-muted mt-1 leading-relaxed line-clamp-2">
                      {item.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-surface-border/70 flex items-center justify-between text-[11px]">
                    <span className="text-accent font-semibold">
                      Self-Pickup Ready
                    </span>
                    <Link
                      to="/menu"
                      className="text-primary font-bold hover:text-accent transition-colors"
                    >
                      Order in Menu &rarr;
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </Container>
      </section>

      {/* 5. LIGHTBOX MODAL */}
      {activeModalItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-dish-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-200"
          onClick={() => setActiveModalItem(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-surface-border relative flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-[4/3] w-full bg-black">
              <img
                src={activeModalItem.image}
                alt={activeModalItem.title}
                className="w-full h-full object-cover object-center"
              />
              <button
                onClick={() => setActiveModalItem(null)}
                aria-label="Close Preview"
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center transition-colors text-sm font-bold"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-accent/15 text-accent text-xs font-bold">
                  {activeModalItem.category}
                </span>
                <span className="text-xs font-semibold text-veg flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-veg" />
                  100% Pure Vegetarian
                </span>
              </div>

              <div>
                <h3 id="modal-dish-title" className="text-xl font-extrabold text-primary">
                  {activeModalItem.title}
                </h3>
                <p className="text-xs sm:text-sm text-muted mt-1 leading-relaxed">
                  {activeModalItem.description}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-secondary border border-surface-border text-xs text-muted flex items-center justify-between">
                <span>Direct Counter Parcel Pickup</span>
                <span className="font-bold text-primary">Happiness Restaurant</span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setActiveModalItem(null)}
                  className="px-4 py-2.5 rounded-xl border border-surface-border text-xs font-bold text-muted hover:text-primary transition-colors"
                >
                  Close
                </button>
                <Link
                  to="/menu"
                  className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-bold transition-all shadow-xs"
                >
                  Order in Menu
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. CALL TO ACTION */}
      <section className="pt-4 pb-8" aria-labelledby="cta-gallery-heading">
        <Container>
          <div className="bg-white rounded-3xl border border-surface-border p-8 sm:p-12 text-center max-w-3xl mx-auto space-y-6 shadow-xs">
            <div className="space-y-2">
              <span className="text-xs font-bold text-accent uppercase tracking-wider block">
                Fresh Vegetarian Cooking
              </span>
              <h2
                id="cta-gallery-heading"
                className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight"
              >
                Ready to Enjoy These Dishes?
              </h2>
              <p className="text-xs sm:text-sm text-muted max-w-lg mx-auto leading-relaxed">
                Select your favorite items from our 16 menu categories, customize your order, and collect your fresh parcel at our counter.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                to="/menu"
                className="px-6 py-3 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs sm:text-sm font-bold transition-all shadow-xs focus-visible:ring-2 focus-visible:ring-accent"
              >
                View Menu
              </Link>
              <Link
                to="/about"
                className="px-6 py-3 rounded-xl bg-secondary hover:bg-secondary-dark text-primary border border-surface-border text-xs sm:text-sm font-bold transition-all shadow-2xs focus-visible:ring-2 focus-visible:ring-accent"
              >
                About Us
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
