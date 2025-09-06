from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def root():
    return {"ok": True, "msg": "GenesisGates is up"}
