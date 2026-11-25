from backend.app.routers.datamart import router
for r in router.routes:
    print(r.path, r.methods)
