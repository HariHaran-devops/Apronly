"use client";

import Link from "next/link";

import { useRouter } from "next/navigation";

import { useState, type FormEvent } from "react";

import { createClient } from "@/lib/supabase/client";

const inputClass =

  "w-full rounded-xl border border-border bg-white px-4 py-3 text-sm outline-none transition placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-60";

const labelClass = "mb-2 block text-sm font-medium";

const categories = [

  "Fine Dining",

  "Casual Dining",

  "Cafe",

  "Quick Service Restaurant",

  "Bakery",

  "Cloud Kitchen",

  "Bar and Lounge",

  "Hotel Restaurant",

  "Food Court",

  "Other",

];

type RestaurantApplicationValues = {

  name: string;

  legalName: string;

  description: string;

  businessEmail: string;

  businessPhone: string;

  websiteUrl: string;

  category: string;

  outletName: string;

  addressLine1: string;

  addressLine2: string;

  landmark: string;

  city: string;

  state: string;

  postalCode: string;

  country: string;

  outletPhone: string;

  outletEmail: string;

};

export default function RestaurantApplicationForm({

  initialValues,

  isEditing = false,

}: {

  initialValues?: RestaurantApplicationValues;

  isEditing?: boolean;

}) {

  const router = useRouter();

  const [name, setName] = useState(initialValues?.name ?? "");

  const [legalName, setLegalName] = useState(initialValues?.legalName ?? "");

  const [description, setDescription] = useState(initialValues?.description ?? "");

  const [businessEmail, setBusinessEmail] = useState(initialValues?.businessEmail ?? "");

  const [businessPhone, setBusinessPhone] = useState(initialValues?.businessPhone ?? "");

  const [websiteUrl, setWebsiteUrl] = useState(initialValues?.websiteUrl ?? "");

  const [category, setCategory] = useState(initialValues?.category ?? "");

  const [outletName, setOutletName] = useState(initialValues?.outletName ?? "");

  const [addressLine1, setAddressLine1] = useState(initialValues?.addressLine1 ?? "");

  const [addressLine2, setAddressLine2] = useState(initialValues?.addressLine2 ?? "");

  const [landmark, setLandmark] = useState(initialValues?.landmark ?? "");

  const [city, setCity] = useState(initialValues?.city ?? "");

  const [state, setState] = useState(initialValues?.state ?? "");

  const [postalCode, setPostalCode] = useState(initialValues?.postalCode ?? "");

  const [country, setCountry] = useState(initialValues?.country ?? "India");

  const [outletPhone, setOutletPhone] = useState(initialValues?.outletPhone ?? "");

  const [outletEmail, setOutletEmail] = useState(initialValues?.outletEmail ?? "");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");
function normalize(value: string) {

    return value.trim().replace(/\s+/g, " ");

  }

  function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
  }

  function isValidPhone(value: string) {

    return (

      value.length >= 7 &&

      value.length <= 30 &&

      /^[+0-9() .-]+$/.test(value)

    );

  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {

    event.preventDefault();

    setError("");

    const values = {

      name: normalize(name),

      legalName: normalize(legalName),

      description: description.trim(),

      businessEmail: businessEmail.trim().toLowerCase(),

      businessPhone: businessPhone.trim(),

      websiteUrl: websiteUrl.trim(),

      category: normalize(category),

      outletName: normalize(outletName),

      addressLine1: normalize(addressLine1),

      addressLine2: normalize(addressLine2),

      landmark: normalize(landmark),

      city: normalize(city),

      state: normalize(state),

      postalCode: normalize(postalCode),

      country: normalize(country),

      outletPhone: outletPhone.trim(),

      outletEmail: outletEmail.trim().toLowerCase(),

    };

    if (values.name.length < 2 || values.name.length > 200) {

      setError("Restaurant name must be between 2 and 200 characters.");

      return;

    }

    if (values.legalName.length > 200) {

      setError("Legal business name cannot exceed 200 characters.");

      return;

    }

    if (values.description.length > 2000) {

      setError("Description cannot exceed 2,000 characters.");

      return;

    }

    if (

      values.businessEmail.length > 254 ||

      !isValidEmail(values.businessEmail)

    ) {

      setError("Enter a valid business email address.");

      return;

    }

    if (!isValidPhone(values.businessPhone)) {

      setError("Enter a valid business phone number.");

      return;

    }

    if (

      values.websiteUrl &&
      (values.websiteUrl.length > 2048 ||
        !/^https?:\/\/.+/i.test(values.websiteUrl))

    ) {

      setError("Website must be a valid HTTP or HTTPS URL.");

      return;

    }

    if (values.category.length < 2 || values.category.length > 80) {

      setError("Select a restaurant category.");

      return;

    }

    if (values.outletName.length < 2 || values.outletName.length > 150) {

      setError("Outlet name must be between 2 and 150 characters.");

      return;

    }

    if (

      values.addressLine1.length < 5 ||

      values.addressLine1.length > 300

    ) {

      setError("Enter a valid primary outlet address.");

      return;

    }

    if (values.addressLine2.length > 300) {

      setError("Address line 2 cannot exceed 300 characters.");

      return;

    }

    if (values.landmark.length > 150) {

      setError("Landmark cannot exceed 150 characters.");

      return;

    }

    if (values.city.length < 2 || values.city.length > 100) {

      setError("Enter a valid city name.");

      return;

    }

    if (values.state.length < 2 || values.state.length > 100) {

      setError("Enter a valid state.");

      return;

    }

    if (

      values.postalCode.length < 3 ||

      values.postalCode.length > 20

    ) {

      setError("Enter a valid postal code.");

      return;

    }

    if (values.country.length < 2 || values.country.length > 100) {

      setError("Enter a valid country.");

      return;

    }

    if (values.outletPhone && !isValidPhone(values.outletPhone)) {

      setError("Enter a valid outlet phone number.");

      return;

    }

    if (

      values.outletEmail &&

      (values.outletEmail.length > 254 ||

        !isValidEmail(values.outletEmail))

    ) {

      setError("Enter a valid outlet email address.");

      return;

    }

    setLoading(true);

    try {

      const supabase = createClient();

      const { data, error: applicationError } = await supabase.rpc(

        "submit_restaurant_application_v2",

        {

          p_name: values.name,

          p_legal_name: values.legalName || null,

          p_description: values.description || null,

          p_business_email: values.businessEmail,

          p_business_phone: values.businessPhone,

          p_website_url: values.websiteUrl || null,

          p_category: values.category,

          p_outlet_name: values.outletName,

          p_address_line1: values.addressLine1,

          p_address_line2: values.addressLine2 || null,

          p_landmark: values.landmark || null,

          p_city: values.city,

          p_state: values.state,

          p_postal_code: values.postalCode,

          p_country: values.country,

          p_outlet_phone: values.outletPhone || null,

          p_outlet_email: values.outletEmail || null,

        }

      );

      if (applicationError) {

        console.error("Restaurant application failed:", {

          code: applicationError.code,

          message: applicationError.message,

        });

        setError(

          isEditing

            ? "We couldn't save your changes. Please check your details and try again."

            : "We couldn't submit your application. Please check your details and try again."

        );

        return;

      }

      if (!data) {

        console.error("Restaurant application returned no restaurant ID.");

        setError("We couldn't confirm your application. Please try again.");

        return;

      }

      router.replace("/partner");

      router.refresh();

    } catch (submissionError) {

      console.error(

        "Unexpected restaurant application error:",

        submissionError

      );

      setError("Something went wrong. Please try again.");

    } finally {

      setLoading(false);

    }

  }

  return (

    <main className="min-h-screen bg-background px-5 py-10 sm:px-8">

      <div className="mx-auto flex min-h-[80vh] w-full max-w-2xl flex-col justify-center">

        <Link

          href="/"

          className="mb-10 inline-flex w-fit items-center gap-2 text-xl font-semibold tracking-tight"

        >

          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm text-white">

            A

          </span>

          Apronly

        </Link>

        <div className="mb-8">

          <p className="mb-3 text-sm font-medium text-sage">

            RESTAURANT PARTNERSHIP

          </p>

          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">

            {isEditing

              ? "Edit your restaurant application"

              : "Tell us about your restaurant"}

          </h1>

          <p className="mt-3 max-w-xl text-sm leading-6 text-muted">

            {isEditing

              ? "Update your business and primary outlet information. Your changes will be saved to your existing application."

              : "Share your business and outlet details to start your Apronly partnership. Our team will review your application before enabling hiring capabilities."}

          </p>

        </div>

        <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm sm:p-8">

          <form onSubmit={handleSubmit} className="space-y-8">

            {/* Business information */}

            <div className="space-y-5">

              <div>

                <h2 className="text-lg font-semibold">Business information</h2>

                <p className="mt-1 text-sm text-muted">

                  Tell us about the restaurant business joining Apronly.

                </p>

              </div>

              <div>

                <label htmlFor="restaurantName" className={labelClass}>

                  Restaurant name <span className="text-danger">*</span>

                </label>

                <input

                  id="restaurantName"

                  name="restaurantName"

                  type="text"

                  required

                  minLength={2}

                  maxLength={200}

                  autoComplete="organization"

                  value={name}

                  onChange={(event) => setName(event.target.value)}

                  placeholder="e.g. The Grand Kitchen"

                  disabled={loading}

                  className={inputClass}

                />

              </div>

              <div>

                <label htmlFor="legalName" className={labelClass}>

                  Legal business name

                  <span className="ml-2 font-normal text-muted">Optional</span>

                </label>

                <input

                  id="legalName"

                  name="legalName"

                  type="text"

                  maxLength={200}

                  value={legalName}

                  onChange={(event) => setLegalName(event.target.value)}

                  placeholder="Registered company or business name"

                  disabled={loading}

                  className={inputClass}

                />

              </div>

              <div>

                <label htmlFor="category" className={labelClass}>

                  Restaurant category <span className="text-danger">*</span>

                </label>

                <select

                  id="category"

                  name="category"

                  required

                  value={category}

                  onChange={(event) => setCategory(event.target.value)}

                  disabled={loading}

                  className={inputClass}

                >

                  <option value="">Select a category</option>

                  {categories.map((item) => (

                    <option key={item} value={item}>

                      {item}

                    </option>

                  ))}

                </select>

              </div>

              <div>

                <label htmlFor="description" className={labelClass}>

                  About your restaurant

                  <span className="ml-2 font-normal text-muted">Optional</span>

                </label>

                <textarea

                  id="description"

                  name="description"

                  rows={4}

                  maxLength={2000}

                  value={description}

                  onChange={(event) => setDescription(event.target.value)}

                  placeholder="Tell us about your cuisine, operations and restaurant."

                  disabled={loading}

                  className={inputClass + " resize-y"}

                />

                <p className="mt-2 text-right text-xs text-muted">

                  {description.length}/2000

                </p>

              </div>

            </div>

            <div className="border-t border-border" />

            {/* Business contact */}

            <div className="space-y-5">

              <div>

                <h2 className="text-lg font-semibold">Business contact</h2>

                <p className="mt-1 text-sm text-muted">

                  Contact details for the restaurant business.

                </p>

              </div>

              <div>

                <label htmlFor="businessEmail" className={labelClass}>

                  Business email <span className="text-danger">*</span>

                </label>

                <input

                  id="businessEmail"

                  name="businessEmail"

                  type="email"

                  required

                  maxLength={254}

                  autoComplete="email"

                  value={businessEmail}

                  onChange={(event) => setBusinessEmail(event.target.value)}

                  placeholder="business@example.com"

                  disabled={loading}

                  className={inputClass}

                />

              </div>

              <div>

                <label htmlFor="businessPhone" className={labelClass}>

                  Business phone <span className="text-danger">*</span>

                </label>

                <input

                  id="businessPhone"

                  name="businessPhone"

                  type="tel"

                  required

                  maxLength={30}

                  autoComplete="tel"

                  value={businessPhone}

                  onChange={(event) => setBusinessPhone(event.target.value)}

                  placeholder="+91 98765 43210"

                  disabled={loading}

                  className={inputClass}

                />

              </div>

              <div>

                <label htmlFor="websiteUrl" className={labelClass}>

                  Website

                  <span className="ml-2 font-normal text-muted">Optional</span>

                </label>

                <input

                  id="websiteUrl"

                  name="websiteUrl"

                  type="url"

                  maxLength={2048}

                  value={websiteUrl}

                  onChange={(event) => setWebsiteUrl(event.target.value)}

                  placeholder="https\://www\.example.com"

                  disabled={loading}

                  className={inputClass}

                />

              </div>

            </div>

            <div className="border-t border-border" />

            {/* Primary outlet */}

            <div className="space-y-5">

              <div>

                <h2 className="text-lg font-semibold">Primary outlet</h2>

                <p className="mt-1 text-sm text-muted">

                  Add the first restaurant location. You can manage additional

                  outlets later.

                </p>

              </div>

              <div>

                <label htmlFor="outletName" className={labelClass}>

                  Outlet name <span className="text-danger">*</span>

                </label>

                <input

                  id="outletName"

                  name="outletName"

                  type="text"

                  required

                  minLength={2}

                  maxLength={150}

                  value={outletName}

                  onChange={(event) => setOutletName(event.target.value)}

                  placeholder="e.g. The Grand Kitchen - Jubilee Hills"

                  disabled={loading}

                  className={inputClass}

                />

              </div>

              <div>

                <label htmlFor="addressLine1" className={labelClass}>

                  Address line 1 <span className="text-danger">*</span>

                </label>

                <input

                  id="addressLine1"

                  name="addressLine1"

                  type="text"

                  required

                  minLength={5}

                  maxLength={300}

                  autoComplete="address-line1"

                  value={addressLine1}

                  onChange={(event) => setAddressLine1(event.target.value)}

                  placeholder="Building, street and area"

                  disabled={loading}

                  className={inputClass}

                />

              </div>

              <div>

                <label htmlFor="addressLine2" className={labelClass}>

                  Address line 2

                  <span className="ml-2 font-normal text-muted">Optional</span>

                </label>

                <input

                  id="addressLine2"

                  name="addressLine2"

                  type="text"

                  maxLength={300}

                  autoComplete="address-line2"

                  value={addressLine2}

                  onChange={(event) => setAddressLine2(event.target.value)}

                  placeholder="Floor, suite or additional address details"

                  disabled={loading}

                  className={inputClass}

                />

              </div>

              <div>

                <label htmlFor="landmark" className={labelClass}>

                  Nearby landmark

                  <span className="ml-2 font-normal text-muted">Optional</span>

                </label>

                <input

                  id="landmark"

                  name="landmark"

                  type="text"

                  maxLength={150}

                  value={landmark}

                  onChange={(event) => setLandmark(event.target.value)}

                  placeholder="Near a metro station or landmark"

                  disabled={loading}

                  className={inputClass}

                />

              </div>

              <div className="grid gap-5 sm:grid-cols-2">

                <div>

                  <label htmlFor="city" className={labelClass}>

                    City <span className="text-danger">*</span>

                  </label>

                  <input

                    id="city"

                    name="city"

                    type="text"

                    required

                    minLength={2}

                    maxLength={100}

                    autoComplete="address-level2"

                    value={city}

                    onChange={(event) => setCity(event.target.value)}

                    placeholder="e.g. Hyderabad"

                    disabled={loading}

                    className={inputClass}

                  />

                </div>

                <div>

                  <label htmlFor="state" className={labelClass}>

                    State <span className="text-danger">*</span>

                  </label>

                  <input

                    id="state"

                    name="state"

                    type="text"

                    required

                    minLength={2}

                    maxLength={100}

                    autoComplete="address-level1"

                    value={state}

                    onChange={(event) => setState(event.target.value)}

                    placeholder="e.g. Telangana"

                    disabled={loading}

                    className={inputClass}

                  />

                </div>

                <div>

                  <label htmlFor="postalCode" className={labelClass}>

                    Postal code <span className="text-danger">*</span>

                  </label>

                  <input

                    id="postalCode"

                    name="postalCode"

                    type="text"

                    required

                    minLength={3}

                    maxLength={20}

                    autoComplete="postal-code"

                    value={postalCode}

                    onChange={(event) => setPostalCode(event.target.value)}

                    placeholder="e.g. 500033"

                    disabled={loading}

                    className={inputClass}

                  />

                </div>

                <div>

                  <label htmlFor="country" className={labelClass}>

                    Country <span className="text-danger">*</span>

                  </label>

                  <input

                    id="country"

                    name="country"

                    type="text"

                    required

                    minLength={2}

                    maxLength={100}

                    autoComplete="country-name"

                    value={country}

                    onChange={(event) => setCountry(event.target.value)}

                    placeholder="e.g. India"

                    disabled={loading}

                    className={inputClass}

                  />

                </div>

              </div>

            </div>

            <div className="border-t border-border" />

            {/* Outlet contact */}

            <div className="space-y-5">

              <div>

                <h2 className="text-lg font-semibold">Outlet contact</h2>

                <p className="mt-1 text-sm text-muted">

                  Optional contact details specific to this location.

                </p>

              </div>

              <div>

                <label htmlFor="outletPhone" className={labelClass}>

                  Outlet phone

                  <span className="ml-2 font-normal text-muted">Optional</span>

                </label>

                <input

                  id="outletPhone"

                  name="outletPhone"

                  type="tel"

                  maxLength={30}

                  value={outletPhone}

                  onChange={(event) => setOutletPhone(event.target.value)}

                  placeholder="+91 98765 43210"

                  disabled={loading}

                  className={inputClass}

                />

              </div>

              <div>

                <label htmlFor="outletEmail" className={labelClass}>

                  Outlet email

                  <span className="ml-2 font-normal text-muted">Optional</span>

                </label>

                <input

                  id="outletEmail"

                  name="outletEmail"

                  type="email"

                  maxLength={254}

                  value={outletEmail}

                  onChange={(event) => setOutletEmail(event.target.value)}

                  placeholder="outlet@example.com"

                  disabled={loading}

                  className={inputClass}

                />

              </div>

            </div>

            {error && (

              <p

                role="alert"

                className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger"

              >

                {error}

              </p>

            )}

            <div className="rounded-2xl border border-border bg-surface-muted p-4">

              <p className="text-sm font-medium">What happens next?</p>

              <ol className="mt-3 space-y-2 text-sm leading-6 text-muted">

                <li>1. Your business and primary outlet details are submitted.</li>

                <li>2. Apronly reviews your restaurant application.</li>

                <li>3. Hiring access is enabled after approval.</li>

              </ol>

            </div>

            <button

              type="submit"

              disabled={loading}

              className="w-full rounded-xl bg-primary px-5 py-3.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"

            >

              {loading

                ? isEditing

                  ? "Saving changes..."

                  : "Submitting application..."

                : isEditing

                  ? "Save application changes"

                  : "Submit application"}

            </button>

            <p className="text-center text-xs leading-5 text-muted">

              {isEditing

                ? "You can update your application while it is pending review. Changes will be saved to your existing application."

                : "Already submitted an application? You can safely retry. Apronly will not create a duplicate application for the same account."}

            </p>

          </form>

        </section>

        <p className="mt-7 text-center text-sm text-muted">

          Need to return to your account?{" "}

          <Link

            href="/auth/complete"

            className="font-semibold text-foreground underline underline-offset-4"

          >

            Continue to your workspace

          </Link>

        </p>

      </div>

    </main>

  );

}
