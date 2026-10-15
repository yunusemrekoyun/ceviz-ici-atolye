export interface Cabin {
  id: string;
  name: string;
  location: string;
  price: number;
  rating: number;
  reviewsCount: number;
  description: string;
  imageUrl: string;
  images?: string[];
  amenities: string[];
  specs: {
    guests: string;
    beds: string;
    baths: string;
    size: string;
  };
  climate: {
    temperature: number;
    humidity: number;
    windSpeed: number;
    airQuality: string;
  };
}

export interface Review {
  id: string;
  userName: string;
  rating: number;
  date: string;
  comment: string;
  avatarUrl: string;
}

export interface ExperienceItem {
  id: string;
  name: string;
  price: number;
  duration: string;
  rating: number;
  teaser: string;
  description: string;
}
