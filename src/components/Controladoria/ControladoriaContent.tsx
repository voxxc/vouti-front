 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
 import { FileText, Bell, Scale, Building2, RefreshCw, ClipboardCheck } from "lucide-react";
 import { OABManager } from "@/components/Controladoria/OABManager";
 import { CNPJManager } from "@/components/Controladoria/CNPJManager";
 import { CentralControladoria } from "@/components/Controladoria/CentralControladoria";
 import { useControladoriaCache } from "@/hooks/useControladoriaCache";
 import { Skeleton } from "@/components/ui/skeleton";
 
 export const ControladoriaContent = () => {
   const { metrics, loading, isCacheLoaded, isRefreshing } = useControladoriaCache();
 
   const showSkeleton = loading && !isCacheLoaded;
 
   return (
    <div className="h-full flex flex-col space-y-6">
       <div className="flex items-center justify-between">
         <div>
           <h1 className="text-3xl font-bold">Controladoria</h1>
           <p className="text-muted-foreground mt-2">Gestao e controle de processos juridicos</p>
         </div>
         {isRefreshing && (
           <div className="flex items-center gap-2 text-sm text-muted-foreground">
             <RefreshCw className="h-4 w-4 animate-spin" />
             <span>Atualizando...</span>
           </div>
         )}
       </div>
 
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
         <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
             <CardTitle className="text-xs font-medium">Total de Processos</CardTitle>
             <FileText className="h-4 w-4 text-muted-foreground" />
           </CardHeader>
           <CardContent>
             {showSkeleton ? (
               <Skeleton className="h-8 w-16" />
             ) : (
               <div className="text-2xl font-bold">{metrics.totalProcessos}</div>
             )}
           </CardContent>
         </Card>
 
         <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
             <CardTitle className="text-xs font-medium">OABs Cadastradas</CardTitle>
             <Scale className="h-4 w-4 text-muted-foreground" />
           </CardHeader>
           <CardContent>
             {showSkeleton ? (
               <Skeleton className="h-8 w-16" />
             ) : (
               <div className="text-2xl font-bold">{metrics.totalOABs}</div>
             )}
           </CardContent>
         </Card>
 
         <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
             <CardTitle className="text-xs font-medium">Processos Monitorados</CardTitle>
             <Bell className="h-4 w-4 text-primary" />
           </CardHeader>
           <CardContent>
             {showSkeleton ? (
               <Skeleton className="h-8 w-16" />
             ) : (
               <div className="text-2xl font-bold">{metrics.monitorados}</div>
             )}
           </CardContent>
         </Card>
 
         <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
             <CardTitle className="text-xs font-medium">Push-Docs (CNPJs)</CardTitle>
             <Building2 className="h-4 w-4 text-muted-foreground" />
           </CardHeader>
           <CardContent>
             {showSkeleton ? (
               <Skeleton className="h-8 w-16" />
             ) : (
               <div className="text-2xl font-bold">{metrics.totalCNPJs}</div>
             )}
           </CardContent>
         </Card>
 
         <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
             <CardTitle className="text-xs font-medium">Push-Docs Monitorados</CardTitle>
             <Bell className="h-4 w-4 text-primary" />
           </CardHeader>
           <CardContent>
             {showSkeleton ? (
               <Skeleton className="h-8 w-16" />
             ) : (
               <div className="text-2xl font-bold">{metrics.cnpjsMonitorados}</div>
             )}
           </CardContent>
         </Card>
       </div>
 
       <Tabs defaultValue="central" className="flex-1 min-h-0 flex flex-col space-y-4">
        <TabsList className="flex-shrink-0">
           <TabsTrigger value="central">
             <ClipboardCheck className="mr-2 h-4 w-4" />
             Central
           </TabsTrigger>
           <TabsTrigger value="minhas-oabs">
             <Scale className="mr-2 h-4 w-4" />
             OABs
           </TabsTrigger>
           <TabsTrigger value="push-doc">
             <Building2 className="mr-2 h-4 w-4" />
             Push-Doc
           </TabsTrigger>
         </TabsList>
 
        <TabsContent value="central" className="flex-1 mt-0">
          <Card className="h-full flex flex-col">
            <CardContent className="pt-6 h-full flex flex-col">
               <CentralControladoria />
             </CardContent>
           </Card>
         </TabsContent>
 
        <TabsContent value="minhas-oabs" className="flex-1 mt-0">
          <Card className="h-full flex flex-col">
            <CardContent className="pt-6 h-full flex flex-col">
               <OABManager />
             </CardContent>
           </Card>
         </TabsContent>
 
        <TabsContent value="push-doc" className="flex-1 mt-0">
          <Card className="h-full flex flex-col">
            <CardContent className="pt-6 h-full flex flex-col">
               <CNPJManager />
             </CardContent>
           </Card>
         </TabsContent>
       </Tabs>
     </div>
   );
 };