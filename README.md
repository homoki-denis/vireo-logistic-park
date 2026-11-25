# Vireo Logistic Park · demo 3D

Demo de prezentare (RO / EN, merge și pe telefon): hartă 3D a unui parc logistic **fictiv**, cu depozite, coduri de produs și pontaj.
**Toate datele sunt inventate**: firma, depozitele, produsele, angajații și ecusoanele. Nu descriu niciun loc și nicio persoană reale.

Stack: **Next.js 15 · React 19 · TypeScript · React Three Fiber (three.js) · drei · zustand**.

## Pornire

```bash
npm install
npm run dev                      # http://localhost:3000
npm run build && npm start       # producție
STATIC_EXPORT=1 npm run build    # site static în out/
```

## Ce face

- **Hartă 3D** cu 6 depozite (POC, LIR, VEN, TEM, ARC, SEZ), clădirea de birouri ADM și atelierul MNT. Mai sunt stivuitoare și camioane animate, iar barierele de la poartă se ridică automat.
- **Coduri de produs.** Fiecare cod are prefixul depozitului: `POC235` = Mănuși de lucru din depozitul POC. Codul e căutabil din bara de sus (tasta `/`) și din tabul *Produse*.
- **Pontaj.** Vezi cine e prezent acum în fiecare clădire principală (tabul *Pontaj* sau click pe un depozit). Fișa fiecărei persoane are ecusonul, rolul, tura, ora de pontare, interiorul și ultima scanare.
- **Activitate live** (simulată): pontări, pauze, scanări de produse și mutări între depozite.

## Unde modifici

| Fișier | Ce conține |
| --- | --- |
| `lib/catalog.ts` | depozitele (cod, nume, culoare), produsele și angajații (generați determinist) |
| `lib/sites.ts` | layout-ul 3D: clădiri, parcări, trasee vehicule, bariere |
| `lib/i18n.ts` | traducerile: textele interfeței (RO/EN) și tabelul RO → EN pentru date |
| `lib/sim.ts` | datele „live” simulate (pontaj, stoc, feed). Le poți înlocui cu un API real |
| `components/ui/Panels.tsx` | interfața: căutare, taburi, panouri de detalii |
| `components/three/*` | modelele 3D și camera |

Un depozit nou se adaugă cu o intrare în `DEPOTS` (catalog) și o clădire cu același `code` în `sites.ts`.
