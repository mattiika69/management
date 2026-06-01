export function billingCheckoutRedirects(appOrigin: string, authenticated: boolean) {
  if (authenticated) {
    return {
      successUrl: `${appOrigin}/get-started?billing=success`,
      cancelUrl: `${appOrigin}/get-started?billing=cancelled`,
    };
  }

  return {
    successUrl: `${appOrigin}/signup?checkout=success`,
    cancelUrl: `${appOrigin}/?checkout=cancelled`,
  };
}
