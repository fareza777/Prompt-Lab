package app.promptlab.twa;

import android.app.Activity;

import androidx.annotation.NonNull;

import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryProductDetailsResult;
import com.android.billingclient.api.QueryPurchasesParams;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;

/**
 * Play Billing bridge for the Capacitor wrapper. Replaces the Digital Goods
 * API surface the TWA provided: product details, subscription purchases,
 * purchase restoration, and acknowledgement after server-side verification.
 */
@CapacitorPlugin(name = "PlayBilling")
public class PlayBillingPlugin extends Plugin implements PurchasesUpdatedListener {

    private static class PendingOp {
        final PluginCall call;
        final Runnable work;

        PendingOp(PluginCall call, Runnable work) {
            this.call = call;
            this.work = work;
        }
    }

    private BillingClient billingClient;
    private boolean connecting = false;
    private final Deque<PendingOp> pendingOps = new ArrayDeque<>();
    private PluginCall pendingPurchaseCall;

    private BillingClient client() {
        if (billingClient == null) {
            billingClient = BillingClient.newBuilder(getContext())
                .setListener(this)
                .enablePendingPurchases(
                    PendingPurchasesParams.newBuilder().enableOneTimeProducts().build()
                )
                .build();
        }
        return billingClient;
    }

    private void runWhenConnected(PluginCall call, Runnable work) {
        BillingClient client = client();
        if (client.isReady()) {
            work.run();
            return;
        }
        synchronized (pendingOps) {
            pendingOps.add(new PendingOp(call, work));
        }
        if (connecting) return;
        connecting = true;
        client.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(@NonNull BillingResult result) {
                connecting = false;
                if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                    Deque<PendingOp> ops;
                    synchronized (pendingOps) {
                        ops = new ArrayDeque<>(pendingOps);
                        pendingOps.clear();
                    }
                    for (PendingOp op : ops) op.work.run();
                } else {
                    flushPendingWithError(
                        "Play Billing is unavailable (code " + result.getResponseCode() + ")."
                    );
                }
            }

            @Override
            public void onBillingServiceDisconnected() {
                connecting = false;
                flushPendingWithError("Play Billing connection lost.");
            }
        });
    }

    private void flushPendingWithError(String message) {
        Deque<PendingOp> ops;
        synchronized (pendingOps) {
            ops = new ArrayDeque<>(pendingOps);
            pendingOps.clear();
        }
        for (PendingOp op : ops) op.call.reject(message);
    }

    private QueryProductDetailsParams subsQuery(List<String> productIds) {
        List<QueryProductDetailsParams.Product> products = new ArrayList<>();
        for (String id : productIds) {
            products.add(
                QueryProductDetailsParams.Product.newBuilder()
                    .setProductId(id)
                    .setProductType(BillingClient.ProductType.SUBS)
                    .build()
            );
        }
        return QueryProductDetailsParams.newBuilder().setProductList(products).build();
    }

    private static JSObject toJsDetails(ProductDetails details) {
        JSObject item = new JSObject();
        item.put("productId", details.getProductId());
        item.put("title", details.getTitle());
        item.put("name", details.getName());
        item.put("description", details.getDescription());
        item.put("type", details.getProductType());

        List<ProductDetails.SubscriptionOfferDetails> offers = details.getSubscriptionOfferDetails();
        if (offers != null && !offers.isEmpty()) {
            ProductDetails.SubscriptionOfferDetails offer = offers.get(0);
            item.put("offerToken", offer.getOfferToken());
            item.put("basePlanId", offer.getBasePlanId());
            List<ProductDetails.PricingPhase> phases =
                offer.getPricingPhases().getPricingPhaseList();
            if (!phases.isEmpty()) {
                ProductDetails.PricingPhase last = phases.get(phases.size() - 1);
                item.put("price", last.getFormattedPrice());
                item.put("priceCurrencyCode", last.getPriceCurrencyCode());
                item.put("priceAmountMicros", last.getPriceAmountMicros());
            }
        }
        return item;
    }

    @PluginMethod
    public void getProductDetails(PluginCall call) {
        JSArray ids = call.getArray("productIds");
        if (ids == null || ids.length() == 0) {
            call.reject("productIds is required.");
            return;
        }
        List<String> productIds = new ArrayList<>();
        for (int i = 0; i < ids.length(); i++) {
            String id = ids.optString(i, null);
            if (id != null && !id.isEmpty()) productIds.add(id);
        }
        if (productIds.isEmpty()) {
            call.reject("productIds is required.");
            return;
        }
        runWhenConnected(
            call,
            () -> client().queryProductDetailsAsync(subsQuery(productIds), (result, queryResult) -> {
                if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                    call.reject("Product details query failed (code " + result.getResponseCode() + ").");
                    return;
                }
                JSArray items = new JSArray();
                for (ProductDetails details : queryResult.getProductDetailsList()) {
                    items.put(toJsDetails(details));
                }
                JSObject out = new JSObject();
                out.put("items", items);
                call.resolve(out);
            })
        );
    }

    @PluginMethod
    public void purchase(PluginCall call) {
        String productId = call.getString("productId");
        if (productId == null || productId.isEmpty()) {
            call.reject("productId is required.");
            return;
        }
        String offerToken = call.getString("offerToken");

        List<String> ids = new ArrayList<>();
        ids.add(productId);
        runWhenConnected(
            call,
            () -> client().queryProductDetailsAsync(subsQuery(ids), (result, queryResult) -> {
                List<ProductDetails> detailsList = queryResult.getProductDetailsList();
                if (result.getResponseCode() != BillingClient.BillingResponseCode.OK
                    || detailsList.isEmpty()) {
                    call.reject(
                        "Product not found in Play Console (code " + result.getResponseCode() + ")."
                    );
                    return;
                }

                ProductDetails details = detailsList.get(0);
                List<ProductDetails.SubscriptionOfferDetails> offers =
                    details.getSubscriptionOfferDetails();
                if (offers == null || offers.isEmpty()) {
                    call.reject("No subscription offers configured for this product.");
                    return;
                }

                String token = offerToken;
                if (token == null || token.isEmpty()) {
                    token = offers.get(0).getOfferToken();
                }

                BillingFlowParams.ProductDetailsParams productParams =
                    BillingFlowParams.ProductDetailsParams.newBuilder()
                        .setProductDetails(details)
                        .setOfferToken(token)
                        .build();
                List<BillingFlowParams.ProductDetailsParams> paramsList = new ArrayList<>();
                paramsList.add(productParams);

                Activity activity = getActivity();
                if (activity == null) {
                    call.reject("App is not in the foreground.");
                    return;
                }

                BillingResult launch = client().launchBillingFlow(
                    activity,
                    BillingFlowParams.newBuilder().setProductDetailsParamsList(paramsList).build()
                );
                if (launch.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                    call.reject(
                        "Could not open the Play purchase sheet (code " +
                            launch.getResponseCode() + ")."
                    );
                    return;
                }
                pendingPurchaseCall = call;
            })
        );
    }

    @Override
    public void onPurchasesUpdated(@NonNull BillingResult result, List<Purchase> purchases) {
        PluginCall call = pendingPurchaseCall;
        pendingPurchaseCall = null;
        if (call == null) return;

        int code = result.getResponseCode();
        if (code == BillingClient.BillingResponseCode.OK && purchases != null) {
            for (Purchase purchase : purchases) {
                if (purchase.getPurchaseState() != Purchase.PurchaseState.PURCHASED) continue;
                JSObject out = new JSObject();
                out.put("purchaseToken", purchase.getPurchaseToken());
                List<String> products = purchase.getProducts();
                out.put("productId", products.isEmpty() ? "" : products.get(0));
                JSArray productIds = new JSArray();
                for (String product : products) productIds.put(product);
                out.put("productIds", productIds);
                call.resolve(out);
                return;
            }
            call.reject("Purchase did not complete.");
        } else if (code == BillingClient.BillingResponseCode.USER_CANCELED) {
            call.reject("Purchase canceled.", "USER_CANCELED");
        } else {
            call.reject(
                "Purchase failed (code " + code + "): " + result.getDebugMessage()
            );
        }
    }

    @PluginMethod
    public void listPurchases(PluginCall call) {
        QueryPurchasesParams params = QueryPurchasesParams.newBuilder()
            .setProductType(BillingClient.ProductType.SUBS)
            .build();
        runWhenConnected(
            call,
            () -> client().queryPurchasesAsync(params, (result, purchases) -> {
                if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                    call.reject("Could not list purchases (code " + result.getResponseCode() + ").");
                    return;
                }
                JSArray items = new JSArray();
                for (Purchase purchase : purchases) {
                    if (purchase.getPurchaseState() != Purchase.PurchaseState.PURCHASED) continue;
                    List<String> products = purchase.getProducts();
                    JSObject item = new JSObject();
                    item.put("productId", products.isEmpty() ? "" : products.get(0));
                    item.put("purchaseToken", purchase.getPurchaseToken());
                    items.put(item);
                }
                JSObject out = new JSObject();
                out.put("purchases", items);
                call.resolve(out);
            })
        );
    }

    @PluginMethod
    public void acknowledge(PluginCall call) {
        String purchaseToken = call.getString("purchaseToken");
        if (purchaseToken == null || purchaseToken.isEmpty()) {
            call.reject("purchaseToken is required.");
            return;
        }
        AcknowledgePurchaseParams params = AcknowledgePurchaseParams.newBuilder()
            .setPurchaseToken(purchaseToken)
            .build();
        runWhenConnected(
            call,
            () -> client().acknowledgePurchase(params, result -> {
                if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                    call.resolve();
                } else {
                    call.reject(
                        "Acknowledge failed (code " + result.getResponseCode() + ")."
                    );
                }
            })
        );
    }
}
